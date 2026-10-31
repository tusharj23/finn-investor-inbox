"""Repeatable source acquisition for FINN.

The resolver takes an NSE symbol and never reads portfolio/demo configuration.
Network responses are immutable content-addressed files; SQLite stores the last
successful response and all attempts. Failed refreshes retain last-good data and
return explicit stale/error provenance rather than silently claiming freshness.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import csv
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
from html import unescape
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
import sqlite3
import threading
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, parse_qsl, quote, unquote, urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
IST = ZoneInfo("Asia/Kolkata")
UTC = timezone.utc
MAX_RESPONSE = 55 * 1024 * 1024
DISCOVERY_LOCK = threading.Lock()
DISCOVERY_LAST = 0.0
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; FINNSourceCollector/1.0)", "Accept": "application/json,text/html,application/pdf,*/*;q=0.8"}


def now() -> str:
    return datetime.now(UTC).isoformat()


def canonical_url(value: str) -> str:
    parts = urlsplit(value.strip())
    path = re.sub(r"/{2,}", "/", unquote(parts.path))
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not k.lower().startswith("utm_")]
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), quote(path, safe="/@:+_-.()"), urlencode(sorted(query)), ""))


def digest(value: bytes | str) -> str:
    return hashlib.sha256(value.encode() if isinstance(value, str) else value).hexdigest()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text())


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
    temporary.replace(path)


class AcquisitionError(Exception):
    pass


@dataclass
class Fetch:
    body: bytes
    provenance: dict[str, Any]


class Cache:
    def __init__(self, directory: Path):
        self.directory = directory.resolve()
        self.raw = self.directory / "raw"
        self.raw.mkdir(parents=True, exist_ok=True)
        self.database = self.directory / "cache.sqlite3"
        with self.connect() as db:
            db.executescript("""
            CREATE TABLE IF NOT EXISTS responses (
              canonical_url TEXT PRIMARY KEY, original_url TEXT NOT NULL,
              resolved_url TEXT NOT NULL, fetched_at TEXT NOT NULL,
              http_status INTEGER NOT NULL, content_type TEXT, sha256 TEXT NOT NULL,
              file_path TEXT NOT NULL, byte_count INTEGER NOT NULL, headers_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS attempts (
              id INTEGER PRIMARY KEY, canonical_url TEXT NOT NULL,
              original_url TEXT NOT NULL, attempted_at TEXT NOT NULL,
              status TEXT NOT NULL, http_status INTEGER, error TEXT, from_cache INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS attempts_by_url ON attempts(canonical_url, attempted_at);
            """)

    def connect(self):
        db = sqlite3.connect(self.database, timeout=30)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA journal_mode=WAL")
        return db

    def attempt(self, url: str, stamp: str, status: str, code=None, error=None, from_cache=False):
        with self.connect() as db:
            db.execute("INSERT INTO attempts(canonical_url,original_url,attempted_at,status,http_status,error,from_cache) VALUES(?,?,?,?,?,?,?)", (canonical_url(url), url, stamp, status, code, error, int(from_cache)))

    def fetch(self, url: str, ttl: int, force=False, timeout=25, allow_stale=True) -> Fetch:
        if urlsplit(url).scheme != "https":
            raise AcquisitionError("Only HTTPS source URLs are accepted")
        key = canonical_url(url)
        checked = now()
        with self.connect() as db:
            cached = db.execute("SELECT * FROM responses WHERE canonical_url=?", (key,)).fetchone()
        if cached and not force and datetime.fromisoformat(cached["fetched_at"]) + timedelta(seconds=ttl) > datetime.now(UTC):
            self.attempt(url, checked, "cache_hit", cached["http_status"], from_cache=True)
            return self.cached_fetch(cached, checked)
        error = None
        code = None
        for attempt in range(2):
            try:
                if urlsplit(url).hostname == "www.screener.in":
                    # Discovery is shared across workers; avoid bursts against a rate-limited site.
                    global DISCOVERY_LAST
                    with DISCOVERY_LOCK:
                        time.sleep(max(0, 2.5 - (time.monotonic() - DISCOVERY_LAST)))
                        DISCOVERY_LAST = time.monotonic()
                with urlopen(Request(url, headers=HEADERS), timeout=timeout) as response:
                    code = response.status
                    body = response.read(MAX_RESPONSE + 1)
                    if len(body) > MAX_RESPONSE:
                        raise AcquisitionError("Source response exceeded 55 MB limit")
                    final = response.url
                    content_type = response.headers.get("Content-Type", "")
                    response_headers = dict(response.headers.items())
                if not body:
                    raise AcquisitionError("Source returned an empty response")
                sha = digest(body)
                extension = ".pdf" if body.lstrip().startswith(b"%PDF-") else (".json" if "json" in content_type else ".html")
                path = self.raw / (sha + extension)
                if not path.exists():
                    path.write_bytes(body)
                fetched = now()
                with self.connect() as db:
                    db.execute("INSERT OR REPLACE INTO responses VALUES(?,?,?,?,?,?,?,?,?,?)", (key, url, final, fetched, code, content_type, sha, str(path), len(body), json.dumps(response_headers)))
                self.attempt(url, checked, "success", code)
                return Fetch(body, {"originalUrl": url, "canonicalUrl": key, "resolvedUrl": final, "accessedAt": fetched, "accessedAtIST": datetime.fromisoformat(fetched).astimezone(IST).isoformat(), "lastAttemptAt": checked, "httpStatus": code, "contentType": content_type, "sha256": sha, "bytes": len(body), "rawFile": str(path), "fromCache": False, "stale": False})
            except HTTPError as exc:
                code = exc.code
                error = f"HTTP {exc.code} {exc.reason}"
                if attempt == 0 and exc.code in {429, 500, 502, 503, 504}:
                    time.sleep(3 if exc.code == 429 else 0.5)
                    continue
            except (URLError, TimeoutError, OSError, AcquisitionError) as exc:
                error = f"{type(exc).__name__}: {exc}"
            break
        self.attempt(url, checked, "failed", code, error)
        if cached and allow_stale:
            result = self.cached_fetch(cached, checked)
            result.provenance.update(stale=True, refreshError=error, failedHttpStatus=code)
            return result
        raise AcquisitionError(error or "Source fetch failed")

    def cached_fetch(self, row, checked):
        body = Path(row["file_path"]).read_bytes()
        if digest(body) != row["sha256"]:
            raise AcquisitionError("Cached source checksum does not match")
        return Fetch(body, {"originalUrl": row["original_url"], "canonicalUrl": row["canonical_url"], "resolvedUrl": row["resolved_url"], "accessedAt": row["fetched_at"], "accessedAtIST": datetime.fromisoformat(row["fetched_at"]).astimezone(IST).isoformat(), "lastAttemptAt": checked, "httpStatus": row["http_status"], "contentType": row["content_type"], "sha256": row["sha256"], "bytes": row["byte_count"], "rawFile": row["file_path"], "fromCache": True, "stale": False})


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.anchors = []
        self.current = None
        self.h1_depth = 0
        self.name_parts = []
        self.text_parts = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "a" and values.get("href"):
            self.current = {"href": values["href"], "title": values.get("title", ""), "text": ""}
        if tag == "h1":
            self.h1_depth += 1

    def handle_data(self, value):
        self.text_parts.append(value)
        if self.h1_depth:
            self.name_parts.append(value)
        if self.current is not None:
            self.current["text"] += value

    def handle_endtag(self, tag):
        if tag == "a" and self.current is not None:
            self.current["text"] = re.sub(r"\s+", " ", self.current["text"]).strip()
            self.anchors.append(self.current)
            self.current = None
        if tag == "h1":
            self.h1_depth = max(0, self.h1_depth - 1)


def normal_symbol(value: str) -> str:
    symbol = value.strip().upper()
    if symbol.endswith(".NS"):
        symbol = symbol[:-3]
    if not re.fullmatch(r"[A-Z0-9&-]{1,24}", symbol):
        raise AcquisitionError("Enter a valid NSE ticker")
    return symbol


def source_state(symbol: str, family: str, provenance=None, error=None, data_as_of=None, status=None):
    p = provenance or {}
    return {"companySymbol": symbol, "source": family, "status": status or ("stale" if p.get("stale") else "error" if error else "cached" if p.get("fromCache") else "ok"), "lastAttemptAt": p.get("lastAttemptAt", now()), "lastSuccessAt": p.get("accessedAt"), "dataAsOf": data_as_of, "fromCache": p.get("fromCache", False), "stale": p.get("stale", bool(error)), "error": error or p.get("refreshError"), "provenance": p or None}


def resolve_company(cache: Cache, supplied: str, force=False, discover=True):
    """Resolve ANY supplied NSE symbol against the official listing, independent of lists."""
    symbol = normal_symbol(supplied)
    listing = cache.fetch("https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv", 86400, force=False)
    entries = csv.DictReader(io.StringIO(listing.body.decode("utf-8-sig")))
    listed = next((row for row in entries if row.get("SYMBOL") == symbol), None)
    if not listed:
        raise AcquisitionError(f"{symbol} is absent from the NSE listed-equity directory; verify current symbol after corporate actions")
    company = {"symbol": symbol, "name": listed["NAME OF COMPANY"].strip(), "sector": "Not classified", "sizeBand": "unclassified", "documents": [], "resolvedAt": listing.provenance["accessedAt"], "identity": {"source": "NSE official listed-equity directory", "nseSymbol": symbol, "exchangeLinkVerified": True, "isin": listed.get(" ISIN NUMBER", "").strip(), "provenance": listing.provenance}}
    if not discover:
        return company, None, listing
    discovery_errors = []
    for suffix in ["/consolidated/", "/"]:
        url = f"https://www.screener.in/company/{quote(symbol)}{suffix}"
        try:
            response = cache.fetch(url, 86400, force=force)
            parser = PageParser()
            parser.feed(response.body.decode("utf-8", errors="replace"))
            observed = []
            for anchor in parser.anchors:
                parsed = urlsplit(unescape(anchor["href"]))
                if parsed.hostname not in {"www.nseindia.com", "nseindia.com"}:
                    continue
                match = re.search(r"(?:symbol=|/equity/)([^&#?/]+)", unescape(anchor["href"]), re.I)
                if match:
                    observed.append(unquote(match.group(1)).upper())
            if symbol not in observed:
                raise AcquisitionError(f"Discovery page did not contain a matching NSE symbol link for {symbol}")
            resolved_path = unquote(urlsplit(response.provenance["resolvedUrl"]).path)
            resolved_match = re.search(r"/company/([^/]+)/", resolved_path)
            if resolved_match and not resolved_match.group(1).isdigit() and resolved_match.group(1).upper() != symbol:
                raise AcquisitionError(f"Ticker redirected to {resolved_match.group(1)}; verify the post-corporate-action symbol")
            company["discoveryUrl"] = response.provenance["resolvedUrl"]
            return company, parser, response
        except AcquisitionError as exc:
            discovery_errors.append(str(exc))
    company["discoveryError"] = "; ".join(discovery_errors)
    return company, None, listing


def prices(cache: Cache, symbol: str, force=False):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol)}.NS?range=1mo&interval=1d"
    response = cache.fetch(url, 1800, force=force)
    value = json.loads(response.body)
    if value.get("chart", {}).get("error"):
        raise AcquisitionError(f"Yahoo chart error: {value['chart']['error'].get('description','unknown')}")
    result = value["chart"]["result"][0]
    quote_data = result["indicators"]["quote"][0]
    zone = ZoneInfo(result["meta"].get("exchangeTimezoneName", "Asia/Kolkata"))
    access = datetime.fromisoformat(response.provenance["accessedAt"])
    # Only label sessions EOD once the exchange regular session has ended.
    rows = []
    today_local = access.astimezone(zone).date()
    regular_end = result["meta"].get("currentTradingPeriod", {}).get("regular", {}).get("end")
    for i, stamp in enumerate(result.get("timestamp", [])):
        day = datetime.fromtimestamp(stamp, zone).date()
        close = quote_data.get("close", [])[i]
        volume = quote_data.get("volume", [])[i]
        if close is None or volume is None or day > today_local:
            continue
        if day == today_local and (regular_end and access.timestamp() < regular_end):
            continue
        rows.append({"companySymbol": symbol, "symbol": symbol, "date": day.isoformat(), "open": quote_data.get("open", [None] * (i+1))[i], "high": quote_data.get("high", [None] * (i+1))[i], "low": quote_data.get("low", [None] * (i+1))[i], "close": round(float(close), 4), "volume": int(volume), "currency": result["meta"].get("currency", "INR"), "frequency": "EOD", "sessionTimezone": str(zone), "sourceUrl": url, "accessedAt": response.provenance["accessedAt"], "provenance": response.provenance})
    rows = list({(r["companySymbol"], r["date"]): r for r in rows}.values())
    rows.sort(key=lambda r: r["date"])
    if not rows:
        raise AcquisitionError("No completed trading session with close and volume was returned")
    latest = dict(rows[-1])
    if len(rows) > 1 and rows[-2]["close"]:
        latest["changePct"] = round(100 * (latest["close"] / rows[-2]["close"] - 1), 2)
    latest["stale"] = response.provenance.get("stale", False) or (today_local - datetime.fromisoformat(latest["date"]).date()).days > 4
    return rows, latest, source_state(symbol, "prices", response.provenance, data_as_of=latest["date"])


def classify_filing(description: str, text: str):
    title = description.strip()
    value = (title + " " + text).lower()
    outcome = "outcome of board meeting" in value
    if any(s in value for s in ["newspaper", "certificate", "compliance", "trading window", "loss of share", "dematerial", "duplicate share", "esop", "allotment of securities"]):
        return "routine", "Routine disclosure", "Compliance or publication follow-through; the original exchange disclosure remains accessible."
    meeting = any(s in value for s in ["board meeting intimation", "board meeting notice", "meeting intimation", "meeting notice", "meeting scheduled", "meeting shall consider", "meeting will consider", "meeting to consider"])
    if meeting and not outcome:
        return "watch", "Meeting notice", "A forthcoming meeting may lead to new disclosure. This notice does not report approved results."
    actual_results = any(s in title.lower() for s in ["financial result", "quarterly result", "audited result", "unaudited result"])
    if outcome and re.search(r"\b(?:approved|submitted|declared|considered)\b[\s\S]{0,100}\b(?:financial|quarterly) results?\b", text, re.I):
        actual_results = True
    if actual_results:
        return "review", "Results released", "The disclosure reports results that were approved or submitted. Inspect the original period, units and reporting basis."
    if "transcript" in value or "earnings call" in value:
        return "watch", "Earnings call", "Management discussion is available; compare its statements with the reported period."
    if any(s in value for s in ["acquisition", "merger", "demerger", "resignation", "appointment of", "litigation", "penalty", "default", "fund rais", "buyback"]):
        return "review", title or "Material update", "A corporate, leadership, financing or regulatory change deserves inspection of the original disclosure."
    return "watch", title or "Company update", "An exchange disclosure is available; materiality has not been established automatically."


def parse_exchange_time(value: str):
    for form in ["%d-%b-%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d-%b-%Y"]:
        try:
            return datetime.strptime(value, form).replace(tzinfo=IST)
        except (ValueError, TypeError):
            pass
    return None


def announcements(cache: Cache, symbol: str, days=30, force=False):
    until = datetime.now(IST)
    cutoff = until - timedelta(days=days)
    url = "https://www.nseindia.com/api/corporate-announcements?" + urlencode({"index": "equities", "symbol": symbol, "from_date": cutoff.strftime("%d-%m-%Y"), "to_date": until.strftime("%d-%m-%Y")})
    response = cache.fetch(url, 900, force=force)
    raw = json.loads(response.body)
    if not isinstance(raw, list):
        raise AcquisitionError("NSE returned a non-list announcement response")
    cutoff = datetime.now(IST) - timedelta(days=days)
    items = {}
    seen_dates = []
    for value in raw:
        if value.get("symbol", "").upper() != symbol:
            continue
        published = parse_exchange_time(value.get("an_dt") or value.get("sort_date") or "")
        if published and published <= until + timedelta(minutes=5):
            seen_dates.append(published)
        if not published or published < cutoff or published > datetime.now(IST) + timedelta(minutes=5):
            continue
        source_url = value.get("attchmntFile")
        if not source_url or not source_url.startswith("https://"):
            source_url = url
        canonical = canonical_url(source_url)
        sequence = str(value.get("seq_id") or "")
        # URL identity merges repeat announcements across refreshes. Records
        # without a real attachment use the exchange sequence/date identity.
        dedupe_key = f"{symbol}|{canonical}" if source_url != url else f"{symbol}|{sequence}|{published.isoformat()}"
        priority, category, reason = classify_filing(value.get("desc", ""), value.get("attchmntText", ""))
        item = {"id": "nse-" + digest(dedupe_key)[:24], "companySymbol": symbol, "title": value.get("desc") or "Exchange disclosure", "category": category, "priority": priority, "reason": reason, "publishedAt": published.isoformat(), "summary": value.get("attchmntText") or value.get("desc") or "Read the original exchange disclosure.", "sourceUrl": source_url, "originalUrl": source_url, "canonicalUrl": canonical, "exchangeSequenceId": sequence or None, "discoveryUrl": url, "accessedAt": response.provenance["accessedAt"], "provenance": response.provenance, "historical": False, "evidenceStatus": "Exchange-listed original; attachment not yet downloaded"}
        # Keep the earliest publication time for a repeated original URL.
        previous = items.get(dedupe_key)
        if not previous or item["publishedAt"] < previous["publishedAt"]:
            items[dedupe_key] = item
    latest = max(seen_dates).isoformat() if seen_dates else None
    state = source_state(symbol, "announcements", response.provenance, data_as_of=latest, status="empty" if not items and not response.provenance.get("stale") else None)
    state.update(requestedFrom=cutoff.isoformat(), requestedTo=until.isoformat(), receivedRows=len(raw), retainedRows=len(items), rangeFilteredLocally=True)
    return sorted(items.values(), key=lambda f: f["publishedAt"], reverse=True), state


def discover_documents(parser: PageParser, base: str):
    candidates = {"annual_report": [], "earnings_call_transcript": []}
    seen = set()
    for anchor in parser.anchors:
        label = anchor["text"]
        title = anchor["title"]
        value = (label + " " + title).lower()
        url = urljoin(base, unescape(anchor["href"]))
        if not url.startswith("https://"):
            continue
        if re.search(r"annual\s+report\s+20\d\d", label, re.I):
            year = int(re.search(r"20\d\d", label).group())
            if year <= datetime.now(IST).year:
                candidates["annual_report"].append({"url": url, "anchor": label, "yearHint": year})
        elif "raw transcript" in title.lower() or ("transcript" in value and "notes" not in value):
            if canonical_url(url) not in seen:
                candidates["earnings_call_transcript"].append({"url": url, "anchor": label, "title": title})
                seen.add(canonical_url(url))
    candidates["annual_report"].sort(key=lambda a: a["yearHint"], reverse=True)
    return candidates


MONTHS = {name.lower(): i for i, name in enumerate(["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"])}


def fiscal_period(pages: list[str], kind: str):
    text = re.sub(r"\s+", " ", " ".join(pages[:8]))
    year = None
    if kind == "annual_report":
        match = re.search(r"(?:annual report|financial year|FY)\s*(?:for\s*)?(?:FY\s*)?(20\d{2})\s*[-–/]\s*(20\d{2}|\d{2})", text, re.I)
        if match:
            year = int(match.group(1))
            ending = int(match.group(2))
            ending = ending + 2000 if ending < 100 else ending
            return {"label": f"FY{year}-{str(ending)[-2:]}", "start": f"{year}-04-01", "end": f"{ending}-03-31", "verification": "Financial year label found in original PDF text", "verified": True}
        match = re.search(r"year ended\s+(?:March\s+31(?:st)?[,]?\s*|31(?:st)?\s+March[,]?\s*)(20\d{2})", " ".join(pages[:40]), re.I)
        if match:
            ending = int(match.group(1))
            return {"label": f"FY{ending-1}-{str(ending)[-2:]}", "start": f"{ending-1}-04-01", "end": f"{ending}-03-31", "verification": "Year-end date found in original PDF text", "verified": True}
    else:
        match = re.search(r"\bQ([1-4])\s*(?:FY|F\.Y\.)\s*(20\d{2}|\d{2})(?:\s*[-–/]\s*(20\d{2}|\d{2}))?", text, re.I)
        if match:
            quarter = int(match.group(1))
            first = int(match.group(2))
            first = first + 2000 if first < 100 else first
            if match.group(3):
                last = int(match.group(3)); ending = last + 2000 if last < 100 else last
            else:
                ending = first
            year_start = ending - 1
            dates = {1: (f"{year_start}-04-01", f"{year_start}-06-30"), 2: (f"{year_start}-07-01", f"{year_start}-09-30"), 3: (f"{year_start}-10-01", f"{year_start}-12-31"), 4: (f"{ending}-01-01", f"{ending}-03-31")}
            start, end = dates[quarter]
            return {"label": f"Q{quarter} FY{year_start}-{str(ending)[-2:]}", "start": start, "end": end, "verification": "Quarter/FY label found in original transcript PDF text; fiscal-year dates derived from Indian March year-end", "verified": True}
    return {"label": "Reporting period not yet verified", "start": None, "end": None, "verification": "No reliable reporting-period label extracted; not inferred from URL or filename", "verified": False}


def download_document(cache: Cache, symbol: str, candidate, kind: str, discovery_url: str, force=False):
    access_failures = []
    try:
        response = cache.fetch(candidate["url"], 30 * 86400, force=force)
    except AcquisitionError as original_error:
        # BSE's viewer endpoint frequently denies automated access even when the
        # same original attachment is publicly readable at its physical URL.
        parsed = urlsplit(candidate["url"])
        filename = parse_qs(parsed.query).get("Pname", [""])[0]
        if parsed.hostname != "www.bseindia.com" or not re.fullmatch(r"[a-fA-F0-9-]{36}\.pdf", filename):
            raise
        access_failures.append({"url": candidate["url"], "error": str(original_error), "attemptedAt": now()})
        for directory in ["AttachHis", "AttachLive"]:
            fallback = f"https://www.bseindia.com/xml-data/corpfiling/{directory}/{filename}"
            try:
                response = cache.fetch(fallback, 30 * 86400, force=force)
                break
            except AcquisitionError as exc:
                access_failures.append({"url": fallback, "error": str(exc), "attemptedAt": now()})
        else:
            raise AcquisitionError("; ".join(f"{a['url']}: {a['error']}" for a in access_failures))
    if not response.body.lstrip().startswith(b"%PDF-"):
        # BSE AnnPdfOpen sometimes emits an HTML redirect wrapper.
        wrapper = response.body.decode("utf-8", errors="replace")
        links = re.findall(r"(?:src|href)\s*=\s*['\"]([^'\"]+\.pdf(?:\?[^'\"]*)?)", wrapper, re.I)
        if links:
            response = cache.fetch(urljoin(response.provenance["resolvedUrl"], unescape(links[0])), 30 * 86400, force=force)
    if not response.body.lstrip().startswith(b"%PDF-"):
        raise AcquisitionError("The discovered document is not a PDF")
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(response.body))
    text_pages = [(page.extract_text() or "") for page in reader.pages]
    if sum(len(t.strip()) for t in text_pages) < 100:
        raise AcquisitionError("PDF downloaded but readable text extraction failed; OCR is required")
    doc_id = f"{symbol.lower()}-{'annual' if kind == 'annual_report' else 'call'}-{response.provenance['sha256'][:16]}"
    section_start = 1
    if kind == "earnings_call_transcript":
        for i, text in enumerate(text_pages):
            if re.search(r"(?:earnings\s+(?:conference\s+)?call|earnings\s+call\s+transcript)", text[:650], re.I) and not re.search(r"(?:media conference|to all stock exchanges|sub:)", text[:900], re.I):
                section_start = i + 1
                break
    elif not text_pages[0].strip():
        section_start = next((i+1 for i, text in enumerate(text_pages) if len(text.strip()) > 150), 1)
    period = fiscal_period(text_pages[section_start-1:], kind)
    document = {"id": doc_id, "companySymbol": symbol, "title": f"{symbol} {'annual report' if kind == 'annual_report' else 'earnings-call transcript'} · {period['label']}", "type": kind, "period": period["label"], "reportingPeriod": period, "sourceUrl": response.provenance["resolvedUrl"], "originalRequestUrl": candidate["url"], "discoveryUrl": discovery_url, "accessedAt": response.provenance["accessedAt"], "pdfPages": len(reader.pages), "sectionStartPage": section_start, "sha256": response.provenance["sha256"], "bytes": len(response.body), "localFile": response.provenance["rawFile"], "provenance": response.provenance, "historical": False, "accessFailures": access_failures}
    pages = [{"id": f"{doc_id}:{i+1}", "documentId": doc_id, "companySymbol": symbol, "page": i+1, "text": re.sub(r"\s+", " ", text).strip()} for i, text in enumerate(text_pages) if (kind != "earnings_call_transcript" or i+1 >= section_start)]
    return document, pages


def company_job(cache: Cache, supplied: str, research=False, force=False, days=30, selection=None, research_example=False):
    symbol = normal_symbol(supplied)
    company = {"symbol": symbol, "name": symbol, "sector": "Not classified", "sizeBand": "unclassified", "documents": []}
    states = []
    docs = []
    pages = []
    price_rows = []
    filings = []
    parser = None
    page_response = None
    try:
        company, parser, page_response = resolve_company(cache, symbol, force=force, discover=research)
        states.append(source_state(symbol, "identity", company["identity"]["provenance"], data_as_of=company["identity"]["provenance"]["accessedAt"]))
    except Exception as exc:
        states.append(source_state(symbol, "identity", error=str(exc)))
    if selection:
        company.update(sector=selection.get("sector", company["sector"]), sizeBand=selection.get("sizeBand", company["sizeBand"]), selectionReason=selection.get("reason"))
    company["membership"] = {"portfolio": bool(selection), "researchExample": research_example}
    try:
        price_rows, latest, state = prices(cache, symbol, force=force)
        company["market"] = latest
        states.append(state)
    except Exception as exc:
        states.append(source_state(symbol, "prices", error=str(exc)))
    try:
        filings, state = announcements(cache, symbol, days, force)
        states.append(state)
    except Exception as exc:
        states.append(source_state(symbol, "announcements", error=str(exc)))
    if research:
        if parser and page_response:
            candidates = discover_documents(parser, page_response.provenance["resolvedUrl"])
            for kind, options in candidates.items():
                errors = []
                for candidate in options[:3]:
                    try:
                        document, extracted = download_document(cache, symbol, candidate, kind, page_response.provenance["resolvedUrl"], force=force)
                        docs.append(document)
                        pages.extend(extracted)
                        company["documents"].append(document)
                        states.append(source_state(symbol, kind, document["provenance"], data_as_of=document["reportingPeriod"]["end"]))
                        break
                    except Exception as exc:
                        errors.append(f"{candidate['url']}: {exc}")
                else:
                    states.append(source_state(symbol, kind, error="; ".join(errors) if errors else "No original document link found on the fetched company page"))
        else:
            for kind in ["annual_report", "earnings_call_transcript"]:
                states.append(source_state(symbol, kind, error=company.get("discoveryError") or "Document discovery could not run because company resolution failed"))
    return {"company": company, "filings": filings, "documents": docs, "pages": pages, "market": price_rows, "sourceStates": states}


def collect(args):
    started = now()
    portfolio = read_json(ROOT / "portfolio.json")["companies"]
    research_symbols = set(read_json(ROOT / "research-examples.json")["symbols"])
    selections = {c["symbol"]: c for c in portfolio}
    symbols = [normal_symbol(s) for s in args.symbols.split(",")] if args.symbols else list(selections)
    cache = Cache(Path(args.state))
    # Refresh the shared identity directory once per run, not once per company.
    try:
        cache.fetch("https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv", 86400, force=args.force)
    except AcquisitionError:
        pass  # Individual identity states will record the unavailable source.
    jobs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, args.workers)) as pool:
        futures = {pool.submit(company_job, cache, symbol, args.documents or symbol in research_symbols, args.force, args.days, selections.get(symbol), symbol in research_symbols): symbol for symbol in symbols}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            jobs.append(result)
            good = sum(s["status"] in {"ok", "cached", "empty"} for s in result["sourceStates"])
            print(f"{result['company']['symbol']}: {good}/{len(result['sourceStates'])} sources, {len(result['filings'])} filings, {len(result['documents'])} documents", flush=True)
    batch = {"schemaVersion": 1, "runId": "run-" + digest(started)[:16], "startedAt": started, "finishedAt": now(), "companies": [], "filings": [], "documents": [], "pages": [], "market": [], "sourceStates": []}
    for result in sorted(jobs, key=lambda j: symbols.index(j["company"]["symbol"])):
        batch["companies"].append(result["company"])
        for name in ["filings", "documents", "pages", "market", "sourceStates"]:
            batch[name].extend(result[name])
    batch["filings"] = list({f["id"]: f for f in batch["filings"]}.values())
    batch["documents"] = list({d["id"]: d for d in batch["documents"]}.values())
    batch["pages"] = list({p["id"]: p for p in batch["pages"]}.values())
    batch["market"] = list({(r["companySymbol"], r["date"]): r for r in batch["market"]}.values())
    batch["summary"] = {"companies": len(batch["companies"]), "portfolioCompanies": sum(c["membership"]["portfolio"] for c in batch["companies"]), "researchExamples": sum(c["membership"]["researchExample"] for c in batch["companies"]), "filings": len(batch["filings"]), "documents": len(batch["documents"]), "pages": len(batch["pages"]), "marketRows": len(batch["market"]), "errors": sum(s["status"] == "error" for s in batch["sourceStates"]), "staleSources": sum(s["status"] == "stale" for s in batch["sourceStates"]), "cacheHits": sum(s["fromCache"] for s in batch["sourceStates"])}
    write_json(Path(args.output), batch)
    print(json.dumps(batch["summary"], indent=2))
    return batch


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--symbols", help="Comma-separated NSE symbols; resolver accepts symbols outside configured lists")
    cli.add_argument("--documents", action="store_true", help="Discover and download documents for every requested symbol")
    cli.add_argument("--force", action="store_true", help="Bypass freshness TTLs and attempt a real network refresh")
    cli.add_argument("--days", type=int, default=30)
    cli.add_argument("--workers", type=int, default=4)
    cli.add_argument("--state", default=str(ROOT / ".state"))
    cli.add_argument("--output", default=str(ROOT / "output" / "latest.json"))
    collect(cli.parse_args())

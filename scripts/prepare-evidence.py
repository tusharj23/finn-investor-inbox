"""Build this slice's immutable, page-addressed primary-source snapshot.

Run with the bundled Python containing pypdf. This does not refresh sources;
provenance and access times come from the real acquisition probe metadata.
"""
from datetime import datetime
from pathlib import Path
import hashlib
import json
import shutil
import unicodedata

from pypdf import PdfReader, PdfWriter

APP = Path(__file__).resolve().parents[1]
WORKSPACE = APP.parent
PROBE = WORKSPACE / "data_probe"
DATA = APP / "lib" / "data"
PUBLIC = APP / "public" / "documents"
DATA.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)


def load(path):
    return json.loads(path.read_text())


def clean(text):
    return " ".join(unicodedata.normalize("NFKC", text or "").split())


announcements = load(PROBE / "announcements" / "document_metadata.json")
annual_meta = load(PROBE / "infosys" / "annual_2025_26_metadata.json")
eod = load(PROBE / "eod" / "manifest.json")
daily = load(PROBE / "eod" / "infy_daily_ohlcv.json")
feed = load(PROBE / "announcements" / "nse_infy_announcements.json")

documents = [
    {
        "id": "infy-results",
        "title": "Infosys board outcome and financial results",
        "type": "exchange_filing",
        "period": "Quarter and half year ended 30 September 2026",
        "sourceUrl": announcements[0]["request_url"],
        "accessedAt": announcements[0]["accessed_at_utc"],
        "pdfPages": announcements[0]["pdf_page_count"],
        "sectionStartPage": 1,
        "localEvidencePdfUrl": "/documents/infy-results-cover-excerpt.pdf",
        "localEvidenceLabel": "Saved original pages 1-3 only; open the source for the full 195-page filing",
        "sha256": announcements[0]["sha256"],
        "bytes": announcements[0]["bytes"],
    },
    {
        "id": "infy-annual",
        "title": "Infosys Integrated Annual Report 2025-26",
        "type": "annual_report",
        "period": "FY2025-26 · year ended 31 March 2026",
        "sourceUrl": annual_meta["original_url"],
        "accessedAt": annual_meta["accessed_at_utc"],
        "pdfPages": annual_meta["pdf_pages"],
        "localPdfUrl": "/documents/infy-annual.pdf",
        "sectionStartPage": 33,
        "sha256": annual_meta["sha256"],
        "bytes": annual_meta["bytes"],
    },
    {
        "id": "infy-transcript",
        "title": "Infosys Q2 FY27 earnings-call transcript",
        "type": "earnings_call_transcript",
        "period": "Q2 FY2026-27 · quarter ended 30 September 2026",
        "sourceUrl": announcements[1]["request_url"],
        "accessedAt": announcements[1]["accessed_at_utc"],
        "pdfPages": announcements[1]["pdf_page_count"],
        "localPdfUrl": "/documents/infy-transcript.pdf",
        "sectionStartPage": 24,
        "sectionNote": "Earnings call occupies original PDF pages 24-48; preceding pages contain the media conference.",
        "sha256": announcements[1]["sha256"],
        "bytes": announcements[1]["bytes"],
    },
]

paths = {
    "infy-results": PROBE / "announcements" / announcements[0]["file"],
    "infy-annual": PROBE / "infosys" / "annual_2025_26.pdf",
    "infy-transcript": PROBE / "announcements" / announcements[1]["file"],
}

shutil.copyfile(paths["infy-annual"], PUBLIC / "infy-annual.pdf")
shutil.copyfile(paths["infy-transcript"], PUBLIC / "infy-transcript.pdf")
results_reader = PdfReader(paths["infy-results"])
writer = PdfWriter()
for page in results_reader.pages[:3]:
    writer.add_page(page)
writer.add_metadata({"/Title": "Infosys results filing: original pages 1-3 excerpt", "/Subject": "Subset of the 195-page original, not the complete filing"})
with (PUBLIC / "infy-results-cover-excerpt.pdf").open("wb") as stream:
    writer.write(stream)

latest = eod["latest_row"]
companies = [{
    "symbol": "INFY",
    "name": "Infosys",
    "legalName": "Infosys Limited",
    "sector": "Information technology",
    "documents": documents,
    "market": {
        "close": latest["close"],
        "volume": latest["volume"],
        "date": latest["trading_date"],
        "changePct": round((latest["close"] / daily[-2]["close"] - 1) * 100, 2),
        "currency": "INR",
        "sourceUrl": eod["original_url"],
        "accessedAt": eod["accessed_at_utc"],
    },
}]

filings = [{
    "id": "infy-results",
    "companySymbol": "INFY",
    "title": "Quarterly results and interim dividend approved",
    "category": "Results",
    "priority": "review",
    "reason": "New financial results and a cash distribution warrant a closer look at the original figures and terms.",
    "publishedAt": "2026-10-23T16:08:26+05:30",
    "summary": "The board approved audited results for the quarter and half year ended 30 September 2026, and declared an interim dividend. The original filing contains the detailed statements.",
    "documentId": "infy-results",
    "sourceUrl": announcements[0]["request_url"],
}, {
    "id": "infy-transcript",
    "companySymbol": "INFY",
    "title": "Management's Q2 earnings-call discussion is available",
    "category": "Earnings call",
    "priority": "watch",
    "reason": "The analyst call provides management's own explanation and outlook alongside the reported quarter.",
    "publishedAt": "2026-10-28T17:38:42+05:30",
    "summary": "Infosys filed transcripts from its 23 October results-day calls. The analyst earnings-call section begins at original PDF page 24.",
    "documentId": "infy-transcript",
    "sourceUrl": announcements[1]["request_url"],
}]

for i, row in enumerate([x for x in feed if x["desc"] == "Copy of Newspaper Publication"][:2]):
    published = datetime.strptime(row["an_dt"], "%d-%b-%Y %H:%M:%S").isoformat() + "+05:30"
    filings.append({
        "id": f"infy-publication-{i + 1}",
        "companySymbol": "INFY",
        "title": "Newspaper publication notice",
        "category": "Publication notice",
        "priority": "routine",
        "reason": "A publication notice is routine follow-through; the original exchange attachment remains available.",
        "publishedAt": published,
        "summary": row["attchmntText"],
        "sourceUrl": row["attchmntFile"],
        "evidenceStatus": "Original link verified in the fetched NSE feed; attachment not downloaded in this slice.",
    })

tcs_path = DATA / "tcs-source.json"
if tcs_path.is_file() and (PUBLIC / "tcs-transcript.pdf").is_file():
    meta = load(tcs_path)
    tcs_document = {
        "id": "tcs-transcript",
        "title": "TCS Q2 FY27 earnings-call transcript",
        "type": "earnings_call_transcript",
        "period": "Q2 FY2026-27 · quarter ended 30 September 2026",
        "sourceUrl": meta["resolvedUrl"],
        "originalRequestUrl": meta["originalUrl"],
        "discoveryUrl": meta["discoveryUrl"],
        "accessedAt": meta["accessedAt"],
        "pdfPages": meta["pdfPages"],
        "localPdfUrl": "/documents/tcs-transcript.pdf",
        "sectionStartPage": 2,
        "sha256": meta["sha256"],
        "bytes": meta["bytes"],
    }
    companies.append({"symbol": "TCS", "name": "Tata Consultancy Services", "legalName": "Tata Consultancy Services Limited", "sector": "Information technology", "documents": [tcs_document], "coverageNote": "This slice contains a verified earnings transcript; annual-report and EOD integration are not yet connected for TCS."})
    paths["tcs-transcript"] = PUBLIC / "tcs-transcript.pdf"
    filings.append({
        "id": "tcs-transcript",
        "companySymbol": "TCS",
        "title": "TCS earnings-call transcript published",
        "category": "Earnings call",
        "priority": "watch",
        "reason": "Management's discussion is now available in a primary exchange filing.",
        "publishedAt": "2026-10-14T00:00:00+05:30",
        "publishedDateOnly": True,
        "summary": "TCS filed the transcript of its 8 October 2026 earnings call covering the quarter and six months ended 30 September 2026. The cover provides a filing date but no publication time.",
        "documentId": "tcs-transcript",
        "sourceUrl": meta["resolvedUrl"],
    })

pages = []
for company in companies:
    for document in company["documents"]:
        reader = results_reader if document["id"] == "infy-results" else PdfReader(paths[document["id"]])
        for index, page in enumerate(reader.pages):
            number = index + 1
            if document["type"] == "earnings_call_transcript" and number < document["sectionStartPage"]:
                continue
            text = clean(page.extract_text())
            if len(text) < 25:
                continue
            record = {"id": f"{document['id']}:{number}", "documentId": document["id"], "companySymbol": company["symbol"], "page": number, "text": text}
            if document["id"] == "infy-annual" and number == 33:
                record["printedPage"] = "64"
            pages.append(record)

catalog = {
    "companies": companies,
    "filings": filings,
    "snapshotAt": max(document["accessedAt"] for company in companies for document in company["documents"]),
    "coverage": {
        "mode": "verified_source_snapshot",
        "isLive": False,
        "connectedCompanies": len(companies),
        "portfolioTarget": 15,
        "filingsScope": "Selected filings from the source-access snapshot; not a complete portfolio digest",
        "holdoutExcluded": "CERA",
    },
}
(DATA / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2))
(DATA / "pages.json").write_text(json.dumps(pages, ensure_ascii=False, separators=(",", ":")))
for company in companies:
    for document in company["documents"]:
        assert hashlib.sha256(paths[document["id"]].read_bytes()).hexdigest() == document["sha256"]
assert not any(page["documentId"] == "infy-transcript" and page["page"] < 24 for page in pages)
assert not any(company["symbol"] == "CERA" for company in companies)
assert all(path.stat().st_size < 25 * 1024 * 1024 for path in PUBLIC.glob("*.pdf"))
print(f"Prepared {len(companies)} companies, {len(filings)} selected real filings and {len(pages)} primary-document pages.")

import baselineCatalog from "./data/catalog.json" with { type: "json" };
import baselinePages from "./data/pages.json" with { type: "json" };
import type { Catalog, Company, EvidencePage, Filing, IngestionBatch, MarketData, PrimaryDocument, SourceName, SourceState } from "./contracts";

type JsonRow = { data_json: string };
type PageRow = { document_id: string; page: number; company_symbol: string; text: string; printed_page?: string | null };

function parse<T>(row: JsonRow): T { return JSON.parse(row.data_json) as T; }
function now() { return new Date().toISOString(); }
function sourceKey(value: string): string {
  if (["eod", "market", "price", "price_volume"].includes(value)) return "prices";
  if (["filings", "announcement"].includes(value)) return "announcements";
  if (["fundamentals", "discovery", "research"].includes(value)) return "documents";
  return value;
}

export function canonicalSourceUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const name of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(name)) url.searchParams.delete(name);
    // BSE's open-link redirect and its physical attachment identify the same PDF.
    if (/bseindia\.com$/i.test(url.hostname) && /AnnPdfOpen\.aspx$/i.test(url.pathname)) {
      const file = url.searchParams.get("Pname") ?? url.searchParams.get("pname");
      if (file) return `https://www.bseindia.com/xml-data/corpfiling/AttachHis/${file}`.toLowerCase();
    }
    url.searchParams.sort();
    return url.href;
  } catch { return value.trim(); }
}

function documentIdentity(doc: PrimaryDocument): string {
  return `${doc.companySymbol ?? ""}|${doc.sha256 ? `sha:${doc.sha256}` : canonicalSourceUrl(doc.resolvedUrl || doc.sourceUrl)}`;
}
function filingIdentity(filing: Filing): string {
  const url = canonicalSourceUrl(filing.resolvedUrl || filing.sourceUrl);
  if (filing.sourceUrl === filing.discoveryUrl || /\/api\/corporate-announcements/.test(url)) return `${filing.companySymbol}|${filing.exchangeSequenceId || filing.title}|${filing.publishedAt}`;
  return `${filing.companySymbol}|${url && url !== "-" ? url : `${filing.title}|${filing.publishedAt}`}`;
}
function validDate(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function newest(...values: unknown[]): string | undefined { return values.filter(validDate).sort((a, b) => Date.parse(b) - Date.parse(a))[0]; }
function hasMarket(value: MarketData | undefined): value is MarketData { return !!value && Number.isFinite(value.close) && Number.isFinite(value.volume) && value.volume >= 0 && validDate(value.date); }

/** Keep last good coverage on failures. Do not convert the failure into a new successful fetch. */
export function mergeSourceState(previous: SourceState | undefined, incoming: SourceState): SourceState {
  const attempt = incoming.lastAttemptAt ?? incoming.fetchedAt;
  if (previous?.lastAttemptAt && attempt && Date.parse(attempt) < Date.parse(previous.lastAttemptAt)) return previous;
  const failed = incoming.status === "error" || incoming.status === "missing" || !!incoming.error;
  const merged = { ...previous, ...incoming, source: sourceKey(incoming.source) };
  merged.lastAttemptAt = incoming.lastAttemptAt ?? incoming.fetchedAt ?? previous?.lastAttemptAt;
  merged.lastSuccessAt = failed
    ? newest(incoming.lastSuccessAt, previous?.lastSuccessAt)
    : newest(incoming.lastSuccessAt, incoming.fetchedAt, previous?.lastSuccessAt);
  merged.dataAsOf = failed ? previous?.dataAsOf ?? incoming.dataAsOf : incoming.dataAsOf ?? incoming.asOf ?? previous?.dataAsOf;
  if (!failed) merged.error = incoming.error ?? null;
  return merged;
}

/** Freshness describes successful acquisition, not the age of the fiscal period. */
export function presentSourceState(raw: SourceState | undefined, symbol: string, source: SourceName, hasData: boolean, at = Date.now()): SourceState {
  if (!raw) return { companySymbol: symbol, source, status: "missing", message: hasData ? "Saved evidence is available; refresh status has not been recorded." : "This source has not been fetched yet." };
  const fetchedAt = raw.lastSuccessAt ?? raw.fetchedAt;
  const ttl = source === "documents" ? 86400000 : source === "announcements" ? 900000 : 1800000;
  const age = fetchedAt ? at - Date.parse(fetchedAt) : Infinity;
  const stale = raw.stale === true || !Number.isFinite(age) || age > ttl;
  const failed = raw.status === "error" || raw.status === "partial" || !!raw.error;
  let status: SourceState["status"] = raw.status === "partial" ? "partial" : failed ? "error" : !hasData && raw.status === "missing" ? "missing" : stale ? "stale" : raw.fromCache || raw.status === "cached" ? "cached" : "fresh";
  if (!hasData && !fetchedAt && !failed) status = "missing";
  const message = failed ? (typeof raw.error === "string" ? raw.error : raw.message || "The latest attempt failed; any previously fetched data is retained.")
    : raw.message || (status === "stale" ? "Last successful acquisition is due for refresh." : status === "cached" ? "Using a reusable successful acquisition." : status === "fresh" ? "Source was checked recently." : "No source data has been connected yet.");
  return { ...raw, companySymbol: symbol, source, status, fetchedAt, asOf: raw.dataAsOf ?? raw.asOf, stale, message };
}

async function rows<T>(db: D1Database, sql: string, bindings: unknown[] = []): Promise<T[]> {
  const result = await db.prepare(sql).bind(...bindings).all<T>();
  return result.results ?? [];
}
async function writeStatements(db: D1Database, statements: D1PreparedStatement[]) {
  // D1 batches have bounded work; large annual-report page sets are chunked.
  for (let i = 0; i < statements.length; i += 60) await db.batch(statements.slice(i, i + 60));
}

export async function getCatalog(db?: D1Database): Promise<Catalog> {
  if (!db) return baselineCatalog as Catalog;
  const [companyRows, filingRows, docRows, sourceRows, jobRows] = await Promise.all([
    rows<JsonRow & { updated_at: string }>(db, "SELECT data_json, updated_at FROM companies ORDER BY symbol"),
    rows<JsonRow>(db, "SELECT data_json FROM filings ORDER BY published_at DESC"),
    rows<JsonRow>(db, "SELECT data_json FROM documents ORDER BY id"),
    rows<JsonRow>(db, "SELECT data_json FROM source_states"),
    rows<JsonRow>(db, "SELECT data_json FROM jobs ORDER BY json_extract(data_json, '$.startedAt') DESC LIMIT 1"),
  ]);
  // Empty, explicitly initialized storage can still display the real baseline.
  // An actual D1 query error is propagated; an outage never masquerades as this fallback.
  if (!companyRows.length) return baselineCatalog as Catalog;
  const docs = docRows.map(row => parse<PrimaryDocument>(row));
  const states = sourceRows.map(row => parse<SourceState>(row));
  const companies = companyRows.map(row => {
    const company = parse<Company>(row);
    company.documents = docs.filter(doc => doc.companySymbol === company.symbol);
    const sourceStates: Partial<Record<SourceName, SourceState>> = {};
    for (const source of ["prices", "announcements", "documents"] as const) {
      const raw = states.find(state => state.companySymbol === company.symbol && sourceKey(state.source) === source);
      const hasData = source === "prices" ? hasMarket(company.market) : source === "documents" ? company.documents.length > 0 : !!raw?.lastSuccessAt;
      sourceStates[source] = presentSourceState(raw, company.symbol, source, hasData);
    }
    return { ...company, sourceStates };
  });
  const job = jobRows[0] ? parse<Record<string, unknown>>(jobRows[0]) : undefined;
  return {
    companies,
    filings: filingRows.map(row => parse<Filing>(row)),
    snapshotAt: newest(...states.map(state => state.lastSuccessAt), ...companyRows.map(row => row.updated_at)) ?? (baselineCatalog as Catalog).snapshotAt,
    generatedAt: now(),
    coverage: {
      mode: "ingested_sources",
      isLive: false,
      portfolioCount: companies.filter(company => company.membership?.portfolio).length,
      connectedCompanies: companies.length,
      researchExamples: companies.filter(company => company.membership?.researchExample).map(company => company.symbol),
      filingsScope: "Acquired exchange filings; coverage and failed sources are shown per company. Market observations are end-of-day, not live quotes.",
    },
    refresh: { lastRunAt: typeof job?.finishedAt === "string" ? job.finishedAt : typeof job?.startedAt === "string" ? job.startedAt : undefined, running: job?.status === "running" },
  };
}

export async function getResearchData(db?: D1Database, symbol?: string): Promise<{ catalog: Catalog; pages: EvidencePage[] }> {
  const catalog = await getCatalog(db);
  if (!db) return { catalog, pages: baselinePages as EvidencePage[] };
  const documentIds = new Set(catalog.companies.flatMap(company => company.documents.map(doc => doc.id)));
  if (!(await rows<{ count: number }>(db, "SELECT count(*) AS count FROM companies"))[0]?.count) return { catalog, pages: baselinePages as EvidencePage[] };
  const result = await rows<PageRow>(db, `SELECT document_id, page, company_symbol, text, printed_page FROM pages${symbol ? " WHERE company_symbol = ?" : ""} ORDER BY document_id, page`, symbol ? [symbol.toUpperCase()] : []);
  return { catalog, pages: result.filter(row => documentIds.has(row.document_id)).map(row => ({ id: `${row.document_id}:${row.page}`, documentId: row.document_id, companySymbol: row.company_symbol, page: row.page, text: row.text, ...(row.printed_page ? { printedPage: row.printed_page } : {}) })) };
}

export async function getEvidenceData(db?: D1Database, documentId?: string | null): Promise<{ catalog: Catalog; pages: EvidencePage[] }> {
  const catalog = await getCatalog(db);
  if (!db || !catalog.companies.some(company => company.documents.some(doc => doc.companySymbol))) return { catalog, pages: baselinePages as EvidencePage[] };
  if (!documentId) return { catalog, pages: [] };
  const result = await rows<PageRow>(db, "SELECT document_id, page, company_symbol, text, printed_page FROM pages WHERE document_id = ? ORDER BY page", [documentId]);
  return { catalog, pages: result.map(row => ({ id: `${row.document_id}:${row.page}`, documentId: row.document_id, companySymbol: row.company_symbol, page: row.page, text: row.text, ...(row.printed_page ? { printedPage: row.printed_page } : {}) })) };
}

export async function getDocument(db: D1Database | undefined, id: string): Promise<PrimaryDocument | undefined> {
  if (!db) return (baselineCatalog as Catalog).companies.flatMap(company => company.documents).find(doc => doc.id === id);
  const row = await db.prepare("SELECT data_json FROM documents WHERE id = ?").bind(id).first<JsonRow>();
  return row ? parse<PrimaryDocument>(row) : undefined;
}

export async function applyBatch(db: D1Database, batch: IngestionBatch) {
  const timestamp = batch.finishedAt ?? now();
  const [oldCompanyRows, oldDocRows, oldFilingRows, oldStateRows] = await Promise.all([
    rows<JsonRow>(db, "SELECT data_json FROM companies"), rows<JsonRow>(db, "SELECT data_json FROM documents"), rows<JsonRow>(db, "SELECT data_json FROM filings"), rows<JsonRow>(db, "SELECT data_json FROM source_states"),
  ]);
  const companies = new Map(oldCompanyRows.map(row => { const company = parse<Company>(row); return [company.symbol, company] as const; }));
  const documents = new Map(oldDocRows.map(row => { const doc = parse<PrimaryDocument>(row); return [doc.id, doc] as const; }));
  const docIdentities = new Map([...documents.values()].map(doc => [documentIdentity(doc), doc.id]));
  const docUrls = new Map([...documents.values()].map(doc => [`${doc.companySymbol}|${canonicalSourceUrl(doc.resolvedUrl || doc.sourceUrl)}`, doc.id]));
  const filings = new Map(oldFilingRows.map(row => { const filing = parse<Filing>(row); return [filing.id, filing] as const; }));
  const filingIdentities = new Map([...filings.values()].map(filing => [filingIdentity(filing), filing.id]));
  const sourceStates = new Map<string, SourceState>(oldStateRows.map(row => { const state = parse<SourceState>(row); return [`${state.companySymbol}|${sourceKey(state.source)}`, state] as const; }));
  const updates: D1PreparedStatement[] = [];
  const docIdMap = new Map<string, string>();

  for (const incoming of batch.companies ?? []) {
    const symbol = incoming.symbol.toUpperCase();
    const old = companies.get(symbol);
    const olderMarket = old?.market && incoming.market && (old.market.date > incoming.market.date || (old.market.date === incoming.market.date && Date.parse(old.market.accessedAt || '') > Date.parse(incoming.market.accessedAt || '')));
    const company = { ...old, ...incoming, symbol, documents: [], membership: incoming.membership ?? old?.membership ?? { portfolio: false, researchExample: false }, market: olderMarket ? old?.market : hasMarket(incoming.market) ? incoming.market : old?.market } as Company;
    companies.set(symbol, company);
    updates.push(db.prepare("INSERT INTO companies(symbol,data_json,updated_at) VALUES(?,?,?) ON CONFLICT(symbol) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").bind(symbol, JSON.stringify(company), timestamp));
  }
  for (const item of batch.market ?? []) {
    const symbol = (item.companySymbol ?? item.symbol ?? "").toUpperCase().replace(/\.NS$/, "");
    const old = companies.get(symbol);
    if (!old || !hasMarket(item)) continue;
    if (old.market && Date.parse(old.market.date) > Date.parse(item.date)) continue;
    if (old.market?.date === item.date && Date.parse(old.market.accessedAt || '') > Date.parse(item.accessedAt || '')) continue;
    const company = { ...old, market: old.market?.date === item.date ? {...old.market,...item} : item };
    companies.set(symbol, company);
    updates.push(db.prepare("UPDATE companies SET data_json=?,updated_at=? WHERE symbol=?").bind(JSON.stringify(company), timestamp, symbol));
  }
  for (const item of batch.history ?? []) {
    const symbol = (item.companySymbol ?? item.symbol ?? "").toUpperCase().replace(/\.NS$/, "");
    if (!symbol || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(item.close) || !Number.isFinite(item.volume) || item.close <= 0 || item.volume < 0) continue;
    updates.push(db.prepare("INSERT INTO market_history(company_symbol,session_date,data_json) VALUES(?,?,?) ON CONFLICT(company_symbol,session_date) DO UPDATE SET data_json=excluded.data_json WHERE COALESCE(json_extract(excluded.data_json,'$.accessedAt'),'')>=COALESCE(json_extract(market_history.data_json,'$.accessedAt'),'')").bind(symbol,item.date,JSON.stringify({...item,companySymbol:symbol})));
  }
  const incomingDocuments = [...(batch.documents ?? []), ...(batch.companies ?? []).flatMap(company => (company.documents ?? []).map(doc => ({ ...doc, companySymbol: company.symbol })))];
  for (const incoming of incomingDocuments) {
    const companySymbol = incoming.companySymbol?.toUpperCase();
    if (!companySymbol || !incoming.id || !incoming.sourceUrl) continue;
    const normalized = { ...incoming, companySymbol };
    const identity = documentIdentity(normalized);
    const urlIdentity = `${companySymbol}|${canonicalSourceUrl(incoming.resolvedUrl || incoming.sourceUrl)}`;
    const urlId = docUrls.get(urlIdentity);
    const urlDocument = urlId ? documents.get(urlId) : undefined;
    // A changed binary at the same URL is a new version; preserve old citations.
    const sameVersion = !incoming.sha256 || !urlDocument?.sha256 || incoming.sha256 === urlDocument.sha256;
    const id = docIdentities.get(identity) ?? (sameVersion ? urlId : undefined) ?? (!sameVersion && incoming.id === urlId ? `${incoming.id}-${incoming.sha256!.slice(0,12)}` : incoming.id);
    docIdMap.set(incoming.id, id);
    const old = documents.get(id);
    const document = old?.pdfPages && !normalized.pdfPages ? {...old, lastSeenAt: timestamp} : { ...old, ...normalized, id, firstSeenAt: old?.firstSeenAt ?? timestamp, lastSeenAt: timestamp };
    documents.set(id, document);
    docIdentities.set(identity, id);
    docUrls.set(urlIdentity, id);
    updates.push(db.prepare("INSERT INTO documents(id,company_symbol,data_json) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET company_symbol=excluded.company_symbol,data_json=excluded.data_json").bind(id, companySymbol, JSON.stringify(document)));
  }
  for (const incoming of batch.filings ?? []) {
    const identity = filingIdentity(incoming);
    const id = filingIdentities.get(identity) ?? incoming.id;
    const old = filings.get(id);
    const filing = { ...old, ...incoming, id, ...(incoming.documentId ? { documentId: docIdMap.get(incoming.documentId) ?? incoming.documentId } : {}), firstSeenAt: old?.firstSeenAt ?? timestamp, lastSeenAt: timestamp };
    filings.set(id, filing);
    filingIdentities.set(identity, id);
    updates.push(db.prepare("INSERT INTO filings(id,company_symbol,published_at,data_json) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET company_symbol=excluded.company_symbol,published_at=excluded.published_at,data_json=excluded.data_json").bind(id, filing.companySymbol, filing.publishedAt, JSON.stringify(filing)));
  }
  for (const page of batch.pages ?? []) {
    if (!page.documentId || !Number.isInteger(page.page) || page.page < 1 || typeof page.text !== "string") continue;
    const documentId = docIdMap.get(page.documentId) ?? page.documentId;
    if (!documents.has(documentId)) continue;
    updates.push(db.prepare("INSERT INTO pages(document_id,page,company_symbol,text,printed_page) VALUES(?,?,?,?,?) ON CONFLICT(document_id,page) DO UPDATE SET company_symbol=excluded.company_symbol,text=excluded.text,printed_page=excluded.printed_page").bind(documentId, page.page, page.companySymbol, page.text, page.printedPage ?? null));
  }
  for (const incoming of batch.sourceStates ?? []) {
    const source = sourceKey(incoming.source);
    const key = `${incoming.companySymbol}|${source}`;
    const state = mergeSourceState(sourceStates.get(key), { ...incoming, source });
    sourceStates.set(key, state);
    updates.push(db.prepare("INSERT INTO source_states(company_symbol,source,data_json) VALUES(?,?,?) ON CONFLICT(company_symbol,source) DO UPDATE SET data_json=excluded.data_json").bind(state.companySymbol, source, JSON.stringify(state)));
  }
  await writeStatements(db, updates);
  return { companies: companies.size, documents: documents.size, filings: filings.size, pagesUpserted: batch.pages?.length ?? 0, statements: updates.length, documentIdMap: Object.fromEntries(docIdMap) };
}

export async function getMarketHistory(db:D1Database, symbols:string[]):Promise<MarketData[]> {
  if(!symbols.length)return [];
  const placeholders=symbols.map(()=>"?").join(",");
  const found=await rows<JsonRow>(db,`SELECT data_json FROM market_history WHERE company_symbol IN (${placeholders}) ORDER BY company_symbol,session_date`,symbols);
  return found.map(row=>parse<MarketData>(row));
}

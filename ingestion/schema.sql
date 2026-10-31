-- Apply explicitly before starting the app. Request handlers never perform DDL.
CREATE TABLE IF NOT EXISTS companies (
  symbol TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS filings (
  id TEXT PRIMARY KEY,
  company_symbol TEXT NOT NULL,
  published_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS filings_company_date ON filings(company_symbol, published_at);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  company_symbol TEXT NOT NULL,
  data_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS documents_company ON documents(company_symbol);
CREATE TABLE IF NOT EXISTS pages (
  document_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  company_symbol TEXT NOT NULL,
  text TEXT NOT NULL,
  printed_page TEXT,
  PRIMARY KEY(document_id, page)
);
CREATE INDEX IF NOT EXISTS pages_company ON pages(company_symbol);
CREATE TABLE IF NOT EXISTS source_states (
  company_symbol TEXT NOT NULL,
  source TEXT NOT NULL,
  data_json TEXT NOT NULL,
  PRIMARY KEY(company_symbol, source)
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  data_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS http_cache (
  key TEXT PRIMARY KEY,
  data_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS market_history (
  company_symbol TEXT NOT NULL,
  session_date TEXT NOT NULL,
  data_json TEXT NOT NULL,
  PRIMARY KEY(company_symbol,session_date)
);
CREATE INDEX IF NOT EXISTS market_history_company_date ON market_history(company_symbol,session_date);

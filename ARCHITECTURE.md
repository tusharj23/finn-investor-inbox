# Stack decision — ingestion extension, October 30, 2026

Retain React 19, TypeScript, plain CSS and Vinext on the Sites Cloudflare Worker runtime. Add **D1 for durable records and jobs**, **R2 for original PDFs**, and a small **Python collector with a SQLite HTTP cache** for large document acquisition and text extraction. Drizzle generates the schema migration; request handlers never execute DDL. The Sites build integration remains intact.

The initial static two-company slice proved the filing-to-evidence journey. Expanding to 15 holdings makes mutable acquisition state necessary: a refresh must persist data without rebuilding, and source failures must retain the last good records. A vector database, model service and distributed ingestion platform would add setup without being necessary for this bounded corpus.

## Data paths

```text
Python collector -> SQLite response/attempt cache + content-addressed originals
                 -> dated acquisition batch -> authenticated Worker import
                                             -> D1 metadata/pages + R2 PDFs

Browser -> GET /api/catalog -> D1 source coverage and portfolio
        -> POST /api/companies/resolve -> entire NSE listing + discovery cache
        -> POST /api/refresh -> durable job
        -> GET /api/refresh?jobId=... -> bounded resumable price/filing step
        -> POST /api/research -> D1 pages -> source extract + citation
        -> GET /api/evidence -> registered document/page
        -> GET /api/documents/:id -> original PDF from R2
```

Portfolio membership and research-example membership are separate configuration fields. Neither the Python nor Worker resolver reads those selection lists to establish identity. The NSE directory verifies identity; Screener is only a discovery index. Research evidence comes from original exchange/company PDFs, not Screener summaries.

## Failure and cache behavior

A source failure records attempt time and error while retaining prior data, successful fetch time and covered period. Price and announcement refresh tasks fail independently. Jobs persist progress and a bounded lease; polling advances one company at a time. Reloading and clicking refresh resumes an unfinished job. This is manual resumable refresh, not an unattended scheduler; closing the page stops further poll-driven work after the current step.

Collector TTLs are 30 minutes for prices, 15 minutes for announcements, 24 hours for identity/discovery and 30 days for original PDFs. `--force` bypasses them. Raw responses are content-addressed; attempts and last-good entries persist in SQLite. Worker discovery/price/announcement caches live in D1. UI freshness is computed from successful acquisition time; financial reporting periods and EOD session dates are shown separately.

Filings deduplicate by company and original attachment URL, with exchange sequence/date for records lacking attachments. Documents deduplicate by company/content hash or canonical same-source URL. Changed bytes at a URL retain a separate version and old citations. Pages key on document and physical page. Separate attachments with similar descriptions remain separate: they may be revisions, and the system does not assume identical content without fetching it. Older cached batches cannot roll back newer source states or prices.

## Boundaries

Original PDFs are parsed outside the Worker to avoid its memory/CPU limits. Runtime ticker lookup can discover documents but does not claim they are indexed; the normal CLI can acquire/index any valid NSE symbol without code edits. The browser refresh button explicitly covers prices and filings, while the collector refreshes full documents. Most portfolio holdings have price/filing coverage only; four examples plus the two tested holdouts have indexed research documents.

Inputs are bounded, cross-origin mutations rejected, private imports credential-protected, and local file paths removed from API metadata. Local secrets remain outside the build output; hosted secrets must be configured independently. Source-extract research requires no model key. Hosted database/PDF seeding and hosted-source accessibility remain unverified because the registered Site is inaccessible through the Sites API.

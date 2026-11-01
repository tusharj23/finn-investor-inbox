# FINN — Investor research inbox

FINN puts an NSE portfolio digest beside primary-source company research. It is mobile-first and built for evidence inspection: original filings, annual reports and earnings-call passages stay one tap away from each claim.

## ChatGPT Sites deployment

The ChatGPT Sites copy runs in a Cloudflare Worker with managed D1 and R2 bindings. Unlike the Netlify static snapshot, it can execute the company-resolution and refresh routes. New listed companies are resolved against the NSE equity directory independently of the demo and portfolio lists.

**Public link:** https://finn-company-research.spiffybulb1.chatgpt.site/ — anyone with the link can open it.

**Source repository:** https://github.com/tusharj23/finn-investor-inbox. The deployed Sites version is the current working product. The older Netlify deployment/config is separate: it does not provision the live FINN_DB/FINN_DOCS bindings and has not been verified with this full feature set. A GitHub push may trigger a Netlify build if auto-publishing is connected; it will not publish a new ChatGPT Sites version.

For the original assignment and AI-assisted work record, see [REQUIREMENTS.md](REQUIREMENTS.md) and [AI_BUILD_HISTORY.md](AI_BUILD_HISTORY.md).

The portfolio seed contains 15 holdings and four curated research examples. The public catalog also accepts independently resolved NSE tickers and grows as companies are searched, so company and filing counts change over time. The seed is dated 30 October 2026; per-source freshness is displayed and in-app EOD/filing refresh remains available.

**Latest live check (1 November 2026):** the 30-task portfolio refresh completed with zero reported task errors. HINDALCO, outside the portfolio and curated research examples, returned an extractive answer from its FY2025-26 annual report (PDF page 196); the citation opened the matching passage and original PDF. A separate CERA lookup verified Cera Sanitaryware Limited against the NSE directory and discovered annual-report and earnings-call links. Those two PDFs are visibly marked *Discovered · Text not indexed*, and research correctly reports that indexing is required before it can answer. A discovered link is not treated as searchable evidence.

## What is available

- Search an NSE ticker, verify its identity from the exchange's listing directory, and discover annual-report and transcript links.
- Refresh one selected company's EOD price/volume and NSE announcements, or refresh the configured portfolio.
- Keep a dated digest, routine-filings drawer, configurable EOD threshold alerts, stale/error labels and primary-source links.
- Review a 24-hour briefing (with 7-day and 30-day windows), compact event groups, and company/category/unread filters.
- Save filings and research answers, mark events read or unread, and add short personal notes. These preferences are stored in the browser and do not sync across devices.
- Ask evidence-bounded questions of indexed company documents. Claims show their source period, PDF page and passage; missing or unsupported evidence is called out.
- Inspect a citation passage and open the original document.
- Use the INFY quarterly comparison only as the documented, source-checked example; it is not a general financial-results parser.

A ticker lookup verifies the company and discovers document links. It does not guarantee a readable transcript or annual report. Newly discovered PDFs remain labelled as discovered until the collector indexes and imports their pages. The public Site currently needs that collector/import step for newly discovered tickers; searching the same unindexed document again cannot make its text searchable. A document link is not presented as evidence for a passage that has not been indexed.

## Local setup

Use Node.js 22.13+, pnpm 11.25.0, and Python 3.10+ (with `pypdf` only if collecting/indexing documents).

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

The app uses `FINN_DB` and `FINN_DOCS` bindings. The Sites deployment manages those resources and applies the checked-in migrations. For a new local database, apply the migrations in order using the commands in [INGESTION.md](INGESTION.md).

## Data and refresh

Source collection and import instructions are in [INGESTION.md](INGESTION.md). EOD values are completed-session data, not live quotes. Exchange checks cover a bounded window and are not a completeness guarantee. Historical examples retain their real dates.

Document acquisition and page indexing use the collector. Keep its local state, PDFs, `.dev.vars`, and runtime credentials out of source control. The optional `FINN_INGEST_TOKEN` is a server-only credential for private batch/PDF ingestion; it is not needed by browser requests. Never paste a secret into the app, README, URL, or client storage.

## Security and limits

FINN makes no generative-model API call and needs no model-provider API key. Research answers are extractive and evidence bounded; they are not investment recommendations. The in-app refresh updates price and announcement sources. Full annual-report/transcript acquisition and indexing remains a collector/import step, and source access can fail independently.

See [EVALUATION.md](EVALUATION.md), [VERIFICATION.md](VERIFICATION.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [ingestion/REPORT.md](ingestion/REPORT.md) for checks, trade-offs and observed source results.

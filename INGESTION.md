# Repeatable ingestion and refresh

The selections are `ingestion/portfolio.json` (15 holdings) and `ingestion/research-examples.json` (INFY, TCS, ITC, APLAPOLLO). They control membership and collection scope, not company identity. Both resolvers use the complete NSE listing directory. The current portfolio uses MARUTI after the initial TATAMOTORS symbol failed verification; no silent symbol substitution occurs during lookup.

## Collect and import

From `finn-app`, with Python 3.10+ and `pypdf` installed:

```sh
python3 ingestion/collector.py
python3 ingestion/import_batch.py --baseline
```

Use `--baseline` only for initial seeding. It preserves the previously verified results filing/evidence and clearly labels saved example records. On later imports omit it:

```sh
python3 ingestion/collector.py --force
python3 ingestion/import_batch.py
```

The app must be running with initialized D1/R2 bindings and a random `FINN_INGEST_TOKEN` in ignored `.dev.vars`. The importer reads that file or the matching environment variable; it never prints the credential. Original PDFs are uploaded only to registered document IDs and their SHA-256 is verified before storage. Import chunking avoids a single large page-text request. Local paths are stripped, source states aggregated and latest price summaries preserved.

To create a local import credential once without printing it:

```sh
python3 -c 'import secrets; from pathlib import Path; p=Path(".dev.vars"); assert not p.exists(), "Keep the existing credential"; p.write_text("FINN_INGEST_TOKEN="+secrets.token_urlsafe(32)+"\n"); p.chmod(0o600)'
```

Apply the generated D1 migration before starting a new installation (README command). For later schema changes, edit `db/schema.ts`, run `pnpm db:generate`, inspect the new migration, and apply only pending SQL. Do not rerun the initial CREATE migration on an initialized database. Sites handles hosted migrations on publication; hosted data import is separate from local data.

## Outside both lists

No code change is needed:

```sh
python3 ingestion/collector.py --symbols CERA,HAVELLS --documents --state ingestion/.state/holdout --output ingestion/output/holdout.json
python3 ingestion/import_batch.py ingestion/output/holdout.json
```

Both were tested with an initially empty holdout cache. `--documents` requests indexing without making the companies research examples or holdings. The same path accepts another verified NSE symbol. Runtime **Find company** verifies identity and discovers primary links; text may remain unindexed until the collector/import completes. The interface labels that state and offers the original link without fabricating an answer.

## In-app refresh

**Refresh prices & filings** creates/resumes a D1 job covering two independent tasks per holding. The app polls a job URL; each poll advances bounded work and records actual progress. All 30 tasks completed successfully in the running-app verification. Failed tasks retain last-good records and emit errors. Closing the browser does not run a full unattended ingestion daemon; reopen and click refresh to resume. The CLI remains the full document refresh path.

## Digest and EOD alerts

The portfolio digest defaults to the rolling last 24 hours; the same date window selector offers 7 and 30 days. Items sort into **Review**, **Watch**, and **Routine**, with a short reason attached. Routine records stay in the expandable drawer and retain the original exchange link. A board meeting notice is a prospective event and never counts as released results. Results are prioritized only when the filing title or a board outcome says results were approved/submitted; a press release merely mentioning results is not enough.

Alert preferences are saved in the current browser. Defaults are an absolute daily EOD close move of at least 5% versus the previous valid NSE session, or a completed-session volume at least 2× the arithmetic mean of the previous 20 valid sessions. The current observation is excluded from its baseline. Thresholds may be disabled independently; price settings accept 0.5–25%, and volume settings 1–10×. The 20-session baseline remains fixed. Repeated observations collapse by symbol, session date and alert kind, so checking/refreshing the same data returns stable IDs rather than duplicate alerts. Date windows use the 15:30 Asia/Kolkata session close instant; their start is inclusive and future sessions are excluded. Missing prices, previous closes, and complete baselines are reported; no zeros or shorter baselines are substituted. The refresh endpoint seeds history from Yahoo EOD rows, while first-run imports use the full collector history.

Research responses distinguish a **reported fact** from a **management statement**, show calculations and inference separately (currently none are added by this extractive response), and show a missing-evidence message when no sufficiently relevant source passage is available. Every successful material statement cites the document period, physical PDF page, passage, and preserved original URL. NSE tickers can be entered independently of both curated lists. The in-app resolver discovers links; previously unindexed PDFs still need the documented generic collector/import command before their passage text is available. Cold CERA and HAVELLS traversed that same acquisition, indexing, and import path and returned primary-source responses.

Acquisition cache TTLs: price 30 minutes, announcements 15 minutes, identity/discovery 24 hours, PDF 30 days. A full force refresh actually contacts sources. In-app price/filing refresh also forces a source check. A successful fetch timestamp is not a claim of a new financial reporting period or complete exchange coverage.

## Provenance, dedup and dates

Batches retain original request/final URLs, discovery URL, access and attempt times, exact reporting-period verification, hashes, byte counts and physical pages. `.state/raw` retains original responses, `.state/cache.sqlite3` records fetch attempts, and D1/R2 retain the serving data independently of app builds. These local operational artifacts are ignored in source control. `ingestion/REPORT.md` is the human-readable acquisition record.

Canonical attachment identity deduplicates repeated filings; no-attachment records use exchange sequence/date. PDF hash identity deduplicates mirrors, and changed bytes retain another version. Source-state/price merges reject older updates. Repeated import was tested with stable counts. Historical example records retain their original dates and are separated from the current-clock inbox. Annual reports and transcripts display real reporting periods, including CERA's Q1 FY2026–27 call.

Known real source gap: ITC had no transcript link. Known recoverable failures: BSE viewer HTTP 406 succeeded via the identical attachment filename at BSE's physical PDF path. Initial Screener 429 failures motivated official-directory identity resolution and paced document discovery. All are recorded, not silently converted to success.

## Checks

```sh
pnpm typecheck
pnpm test
python3 -m unittest discover -s ingestion -p 'test_*.py' -v
node scripts/verify-running.mjs http://127.0.0.1:8787
node scripts/verify-ingestion.mjs
```

The last command exercises real network sources and cold/warm VGUARD resolution, then records the 30-task refresh result under ignored `verification/`. Re-running it verifies cached resolution rather than a newly cold symbol. Full cold-acquisition evidence for CERA and HAVELLS is preserved in the acquisition report.

# FINN — Filing to evidence

Mobile-first portfolio inbox and primary-document research. The portfolio has 15 listed NSE companies across sectors and qualitative size bands. Four research examples are INFY, TCS, ITC and APLAPOLLO. Independent resolution uses the full NSE equity directory; CERA and HAVELLS were acquired from empty holdout caches, and VGUARD was resolved through the running app.

The verified local preview is http://127.0.0.1:8787. No public URL is verified: the agreed Sites project lookup previously returned `Sites project not found`, and this environment has no Sites publish operation. Do not share the local URL as a public link.

## Run and initialize

Use Node 22.13+, pnpm 11.25.0, and Python 3.10+ with `pypdf` for collection. The app itself runs in a Cloudflare Worker and does not need Python.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute FINN_DB --config dist/server/wrangler.json --local --persist-to .wrangler/state --file drizzle/0000_spicy_frog_thor.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute FINN_DB --config dist/server/wrangler.json --local --persist-to .wrangler/state --file drizzle/0001_rainy_payback.sql
pnpm start
```

Apply both migrations in sequence on a new local database; on an existing database apply only migrations that have not yet been applied. `pnpm start` uses port 8787 and keeps local secrets outside `dist`. Set a random `FINN_INGEST_TOKEN` in ignored `.dev.vars` before private imports. Do not put its value in command arguments, logs, source, or browser storage. See [INGESTION.md](INGESTION.md) for collection, imports, refresh, and initialization details.

## Connected data

The verified portfolio batch contains 200 filings in a source-filtered 30-day window, 315 daily price/volume observations, four annual reports and three transcripts (1,648 indexed pages). Every portfolio company returned EOD prices and NSE announcements. ITC's transcript was not found; its annual report supports research. Original PDFs, original/resolved URLs, acquisition dates, verified reporting periods and checksums are preserved.

CERA and HAVELLS add four PDFs and 679 indexed pages outside the portfolio and demo lists. CERA's discovered call reports Q1 FY2026–27; it is not relabeled as Q2. VGUARD's runtime discovery returns primary links; newly discovered PDFs explicitly await text indexing by the collector.

The inbox defaults to the last 24 hours and offers 7-day and 30-day periods. Review/Watch priorities have reasons; routine filings remain in their own drawer. Configurable EOD alerts default to a ±5% close move and 2× the previous 20-session mean volume, with session-date baselines, repeat-safe IDs and visible missing-history coverage. Saved historical examples have a separate view and retain actual dates. The price card is EOD context, not live pricing. The refresh button updates prices and filings; original-PDF discovery/download/index refresh uses the collector command.

The INFY Q2 FY27 results detail contains a source-page-checked quarterly comparison for revenue, operating profit, PBT and net profit across Q2 FY27, Q1 FY27 and Q2 FY26. It uses the company's consolidated IFRS fact sheet in ₹ crore, shows source-reported QoQ/YoY growth, and does not derive EBITDA. This structured example is not a general all-company results parser.

## Evidence and security

Responses are explicitly labeled **Source extract**, with question-guided retrieval, period/page citations, and separated reported-fact, management-statement, calculation, inference, and missing-evidence fields. No generative model call or provider key is used. Unsupported questions return an insufficient-evidence state. PDF text cannot issue instructions or initiate network calls.

D1 stores companies, filings, documents, pages, source states, jobs and discovery caches. R2 stores original PDFs. Private batch/PDF writes require a server-only credential; public research and evidence endpoints accept registered identities. Source files, local credentials and the full corpus are not served as browser assets.

See [EVALUATION.md](EVALUATION.md) and [VERIFICATION.md](VERIFICATION.md) for actual checks and limits, [ARCHITECTURE.md](ARCHITECTURE.md) for the stack, and [ingestion/REPORT.md](ingestion/REPORT.md) for acquisition outcomes.


## GitHub and Cloudflare deployment

This folder is a standalone GitHub repository candidate. The application source and lockfile are included; local credentials, runtime state, dependency folders, and build output are excluded. Before publishing this repository publicly, review whether redistributing the extracted source text in `lib/data/pages.json` is appropriate. Cloudflare production deployment is not configured yet: create production D1/R2 resources, add a production Wrangler configuration and bindings, apply migrations, import data, and add `FINN_INGEST_TOKEN` as a Cloudflare runtime secret. The generated local preview configuration is not a production deployment configuration.

# FINN — evidence inbox snapshot

A mobile-first investor digest and primary-document research demo. This folder is prepared for Netlify using Next.js and bundled JSON/PDF evidence. It is a **dated snapshot**, not a live market-data service.

## Run locally

Requirements: Node.js 22.13+ and pnpm 11.25.0 (Corepack can provide pnpm).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. For a production-style local run, use `pnpm build` and then `pnpm start`.

## Publish with Netlify

1. Push this folder as the root of a GitHub repository. Do not add `.env` files, `.dev.vars`, `.wrangler`, `node_modules`, or build output. `.env.example` is a safe template and contains no credentials.
2. In Netlify, choose **Add new site → Import an existing project**, connect GitHub, and select the repository.
3. Set the base directory to the repository root. Use build command `pnpm build` and publish directory `.next`; Netlify detects Next.js and applies its maintained adapter for route handlers and the App Router. Node 22 is specified in `netlify.toml`.
4. Deploy. No API key or database is required for this snapshot. The `/api/*` routes are Next.js server routes and read the bundled data files.
5. After deploy, open the public URL on a phone and check the inbox, INFY/TCS research, citations, and original-document links.

## What the snapshot includes

- A portfolio digest from the included dated announcements, with 24-hour, 7-day, and 30-day windows and routine filings retained.
- Company research for the bundled companies **Infosys (INFY)** and **TCS** using included primary-document passages.
- Evidence citations with document periods, page numbers, original links, and locally saved excerpts/PDFs where included.
- A quarterly results comparison for Infosys based on the bundled filing extract.
- A static ticker lookup independent of the example grouping. It can select only INFY and TCS; other tickers return an explicit “not in snapshot” message.

## Limitations

- Snapshot source collection date: **30 October 2026** (the timestamps for each source remain visible in the app). Prices and filings do not update after deployment.
- Refresh, ingestion, D1/R2 persistence, scheduled jobs, and configurable EOD threshold alerts are not connected in the Netlify build. Price alerts are marked unavailable because the bundle lacks the historical EOD series needed for baselines.
- Company resolution is bounded to bundled tickers; it does not discover unfamiliar companies or fetch new documents.
- No AI provider key is needed: research responses are extractive from the bundled evidence. Answers can only cover the available passages.
- The PDFs and page text are included to make the prototype self-contained. Confirm you have permission to redistribute them publicly before publishing a public repository or site.

## Data and secret handling

This build makes no third-party API calls and has no server secrets. Do not add provider keys or private ingestion tokens to GitHub or browser storage. To add new company data, use the original ingestion workflow in the source project, review source rights, and rebuild the snapshot before deployment.

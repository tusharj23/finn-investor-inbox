# Verification — October 30, 2026

The production Worker runs locally at `http://127.0.0.1:8787`; D1 data and R2 originals persist in `.wrangler/state` between clean Worker restarts. This is a local preview, not a hosted phone-sharing URL.

## Acquisition results

- 15 currently listed NSE portfolio companies were checked across 13 selection sectors. Size bands are qualitative labels.
- The real collector returned 200 exchange filings in its bounded 30-day query, 315 daily EOD price/volume rows, seven primary PDFs, and 1,648 physical-page text records. All 15 price and all 15 NSE announcement sources succeeded in the recorded run.
- Research examples are INFY, TCS, ITC and APLAPOLLO. ITC has an FY2025–26 annual report and no discovered transcript. Its document status explicitly shows partial coverage.
- Cold CERA/HAVELLS acquisition succeeded outside both lists: four primary PDFs, 679 pages, and zero remaining acquisition errors after the same-attachment BSE direct-PDF fallback. Their membership remains false/false.
- Running-app discovery also resolved VGUARD outside both lists, returned two primary document links, and returned the cached identity on repeat without duplicating links. The app reports the links as unindexed until the CLI collector imports readable PDF text.
- An actual forced MARUTI source refresh succeeded. The in-app job then completed all 30 price/announcement tasks for the 15-company portfolio with zero errors.
- Re-import of the cached portfolio batch retained exactly 216 app filing IDs and 15 stored documents, with 1,648 pages. The app holds 215 current-window filings across portfolio and holdout companies plus one older filing marked historical. Every displayed filing retains its original publication date. Old batch timestamps do not roll back the refreshed EOD summary or source-state times.
- Original request URLs, resolved URLs, acquisition/access times, real PDF reporting periods, hashes and byte counts remain in `ingestion/output` and [ingestion/REPORT.md](ingestion/REPORT.md). Local raw-file paths are removed from app responses.

The initial TATAMOTORS symbol returned Yahoo 404 and was absent from the current NSE directory; MARUTI replaced it in the configured portfolio. BSE viewer links returned HTTP 406 on some documents, recovered using the same attachment filename at the direct BSE PDF URL. ITC’s missing transcript remains a source gap. Full attempts, alternatives and dates are in the acquisition report.

## Checks passed

- TypeScript `pnpm typecheck`.
- 24 Node tests: extraction, exact citation, cache idempotency/dedup, changed-PDF versioning, stale failure retention, out-of-list membership, and non-rollback of newer refresh data.
- Seven Python acquisition tests: symbol validation/resolution, cache/checksum, forced failure retaining last good bytes, dedup/date bounds, PDF-period extraction and classification.
- Production Worker build using the Sites build helper.
- 19 running-app HTTP checks (`verification/running-checks.json`): rendered root/client asset, 15 portfolio plus two cold holdouts, current 30-day data, four research-example answers, exact document page evidence, CERA and HAVELLS primary-source answers, explicit unindexed VGUARD state, wrong-symbol 404, unsupported-question 422, bounded and cross-origin inputs, private-write auth, PDF signatures, no public secrets/private corpus, and no client-bundled corpus/key references.
- Dedicated runtime-ingestion check (`verification/ingestion-checks.json`): VGUARD cold/warm discovery and persisted 30/30 source refresh. It captured 216 filings before and after refresh.
- Visual phone-size check at a narrow in-app viewport (354 CSS px measured): no horizontal overflow; the ITC source extract, page 67 evidence sheet and original-document link were visible.

Source periods and latest EOD date are labeled separately from fetch times. The inbox uses a current-clock window; historical examples are a separate filter.

## Digest, alerts, and primary-research checks — October 31, 2026

- Digest default is the rolling last 24 hours, with 7-day and 30-day options. Review/Watch/Routine reasons explain ordering; routine filings remain accessible in the routine drawer. Meeting notices are labeled prospectively and kept separate from actual results outcomes.
- The configured EOD defaults are an absolute close move of at least 5% versus the previous valid session and volume at least 2× the mean of 20 preceding valid sessions. All 315 persisted portfolio observations are provenance-linked; each portfolio holding has 21 observations in the initial snapshot. The current 24-hour check produced one alert. Running the same alert request twice returned identical unique IDs. Changing the threshold and period changed the calculation settings as expected.
- Boundary tests cover the inclusive rolling cutoff, future sessions, and exact threshold equality. Missing-price, missing-prior-close, and <20-session volume history tests report explicit coverage and do not substitute zeros or shorter averages. Reimporting older data does not replace a newer same-day observation.
- Filing tests distinguish a board meeting notice from its actual results outcome and keep routine publication records accessible. Date-window tests include the exact cutoff and reject future timestamps.
- Annual-report research and earnings-call research tests retain original URLs, reporting periods, physical pages, and claim type. Reported facts and management statements have separate labels; the extractive pipeline marks calculations/inference as none added and returns an insufficient-evidence state when no relevant passage is available.
- Updated checks: TypeScript typecheck and production build passed; 33 Node tests and 7 Python tests passed; all 20 local production-Worker HTTP checks passed against the browser's `http://127.0.0.1:8787` preview. These include repeated EOD checks and primary-source answers for CERA and HAVELLS, which are outside the portfolio and research-example lists.
- After the rebuild, the real source refresh again completed all 30 price and NSE-announcement tasks with zero failures; cold/warm VGUARD discovery remained independent of both curated lists. The 20 HTTP checks were rerun after that refresh.
- Browser automation currently reports local browser use disabled in Work settings. The HTTP and mobile-first build checks passed, but this turn did not certify the visual phone layout. Previous narrow viewport observations remain documented above.

## Results enhancement and publication status — October 31, 2026

- Added an INFY Q2 FY27 results comparison backed by the original results filing's physical PDF page 6. It retains the consolidated IFRS basis, ₹ crore, Q2 FY27/Q1 FY27/Q2 FY26 periods, and source-reported growth values. EBITDA is not separately reported and is omitted. The four-quarter guidance-versus-delivery panel remains excluded for lack of four matched periods.
- The endpoint validates the indexed evidence page and ordered source rows before returning any values. Tests confirm the reported numbers, periods, units, source URL, and no-output behavior when the source page is missing or mismatched.
- Latest post-build verification: 35 Node tests, 7 Python tests, typecheck, production build, and 22 local-worker HTTP checks passed. The local URL is `http://127.0.0.1:8787`.
- **Public hosting is not verified.** OpenAI Sites had previously returned `Sites project not found` for the preserved project; no Sites publish tool is exposed in this environment, so no public URL can be given. Do not treat the local preview as publicly reachable. Hosted persistence, freshness, refresh, error handling, and unfamiliar-ticker journeys remain unverified.

## Limits

The Sites API still returns `Sites project not found` for the previously saved project ID. No second Site was created, no hosted build is claimed, and hosted D1/R2 provisioning/seeding remains unverified. Local credentials are in ignored `.dev.vars`; hosted `FINN_INGEST_TOKEN` configuration must be done through the supported server-secret path when Sites access returns.

The collector refreshes and indexes original documents. The in-app button refreshes EOD prices and exchange filings only; its label says so. Refresh is manual and resumable through polling, not an unattended schedule. The tested 15 holdings have price/filing paths; research documents are concentrated in four examples and two cold holdouts. Screener/BSE availability and exchange return windows can change.

No generative model call or provider key is used. Answers are labeled source extracts with citations, not independent analysis. Keep in mind both qualitative portfolio size labels and the Yahoo EOD feed limitations. See [INGESTION.md](INGESTION.md) to reproduce collection, import and refresh checks.


## 2026-11-01 — Netlify snapshot verification

- Public page loaded at [https://finn-investor-inbox.netlify.app/](https://finn-investor-inbox.netlify.app/). The browser showed the dated-snapshot banner, source coverage, INFY EOD card, and unavailable-alert note.
- The catalogue and research screen loaded; the selector contained INFY and TCS. This public build does not expose live ingestion or arbitrary-ticker discovery.
- Research submission failed with “Please send this request from FINN.”
- A source fix was prepared and the Next.js production build passed. Local production API checks with a matching Netlify-style forwarded host returned a cited INFY answer (200); a foreign origin stayed blocked (403). **The deployed site has not received this fix yet.**
- Signed-out GitHub access to the configured remote returned 404. Public repository accessibility remains unresolved.


### Post-push public checks — 1 November 2026

The new Netlify build passed INFY and TCS research requests with page citations, citation-to-passage inspection, saved PDF HEAD (200, `application/pdf`), and the INFY quarterly comparison. An unsupported analyst target question returned an evidence-insufficient message; HINDALCO returned “not in this dated snapshot.” The prior origin-check failure was fixed and the fix is now live. The build remains a static two-company snapshot: refresh and historical threshold alerts are unavailable, and the 24-hour view can be empty. Signed-out GitHub still returns 404; physical phone QA is outstanding.

# FINN build log

## 2026-10-30 - Product direction and prototype scope

**Decision:** Recommend a **prioritised portfolio inbox connected to evidence-backed company research**. Build one connected journey: notice a change, inspect the disclosure, and investigate the company using its own documents.

**Status:** Product scope recorded; no application implementation has started. This entry records intended behavior and planning judgments, not completed work or measured performance. [REQUIREMENTS.md](/Users/tusharjain/Downloads/enam_submission/REQUIREMENTS.md) remains the assignment acceptance baseline. The choices below are our scope decisions, not additional requirements imposed by ENAM.

**Time constraint:** It is October 30, 2026 in India. Target a submission-ready package on **Saturday, October 31**, before the November 1 deadline. The assignment gives no cutoff time or timezone. Feasibility is conditional on establishing source access and unfamiliar-company document retrieval early; neither has been technically validated yet.

### Three small directions considered

All three retain mobile usability, both push and pull, the three mandatory source families, primary-source research, and unfamiliar NSE support. A different interface does not remove the shared data work.

| Direction | Investor's task | Smallest credible product | Strength | Deadline trade-off |
| --- | --- | --- | --- | --- |
| **A. Priority inbox -> company research** | "What deserves my attention across my holdings, and what does the company's evidence say?" | Ranked portfolio inbox, filing detail, compact research with citations and NSE ticker entry. | A clear daily habit and a direct connection between proactive changes and investigation. Evidence stays attached to the event and company. Matches the user's starting preference. | Three simple screens. Slightly more navigation than a brief, but tightly bounded output and a clear demonstration of all sources. **Recommended.** |
| **B. Daily brief -> company detail** | "Catch me up before I start my day." | A short portfolio briefing with expandable items and the same compact research capability. | Smallest reading interface; a morning catch-up is easy to explain. | Modest UI savings. The same ingestion and research work remains; a compressed briefing makes full coverage, omissions, and individual priority decisions less visible. Less useful for returning through the day. |
| **C. Company research desk + change radar** | "Answer a focused question about this company, and tell me whether a portfolio change needs attention." | Ticker-first research, a cited answer, and a compact proactive portfolio-change panel. | Strong on-demand research and unfamiliar-company demonstration. | Also achievable if question scope stays narrow. Research becomes the center of the product, while portfolio triage feels secondary; an expanding chat interface could consume time without improving the daily workflow. |

**Why A:** It best answers the brief's filtering problem, joins push and pull in one useful task, and makes primary evidence easy to inspect on a phone. It also lets us reuse one research screen for portfolio holdings, ad-hoc demo companies, and unfamiliar NSE tickers. Direction B is a sensible later presentation mode; Direction C's ticker entry belongs inside A rather than becoming a separate research product.

This is a scope-based recommendation, not a guarantee of delivery. Source access, document parsing, and cold research are the largest uncertainties in every option. They should be proved before spending substantial time on visual refinement.

### Investor task and intended outcome

Between meetings, an investor opens FINN, identifies one portfolio development worth investigating, checks the actual disclosure, and asks a focused company question. They leave with a short, sourced understanding of the issue and what remains unknown.

The product's value is the transition from **"what changed?" to "what evidence should I inspect?"** Priority represents attention required, with an explanation; it is not a prediction that a share price will rise or fall.

### Scope selected for the first working prototype

| Area | Scope commitment | Reason / boundary |
| --- | --- | --- |
| Portfolio | One fixed mock portfolio of **15** listed companies, varied across sectors and sizes. | Satisfies the required range while limiting integration and verification work. A fixed portfolio avoids spending time on portfolio management. |
| Research demonstrations | **Three** named ad-hoc companies, including at least one outside the portfolio. Select them after checking source availability. | Gives a compact, credible demonstration set. It does not define an allowlist for the research engine. |
| Push | An in-app inbox populated from exchange disclosures without the user having to ask about each company. Default to **24 hours**, with a **7-day** option. Retain all fetched items in the selected window; collapse routine items with a visible count and expansion control. | Demonstrates proactive filtering. The longer window also supports a useful demonstration when the latest 24 hours contain little activity. No notification delivery infrastructure. |
| Prioritisation | Three understandable groups: **Review**, **Watch**, and **Routine**. Show a short reason on each substantive item. Use a small set of transparent rules informed by filing type and content; keep uncertain classifications visible for review. | Explainability is more useful here than an elaborate opaque relevance score. A results publication notice should not automatically rank like an actual results release merely because both share a category. |
| EOD context | Closing price, daily change, and traded volume for all portfolio companies, with trading dates. Show the relevant company's figures beside an inbox item or detail view. | Gives the mandatory market-data source a useful role. Show prices and filings as separate observations; do not claim that a filing caused a price move. No anomaly-alert engine. |
| Filing detail | What changed, why it was prioritised, a short supporting excerpt where available, publication date, and a link to the original exchange disclosure. One action: **Research this company**. | Connects a surfaced item to evidence and the next useful task. Do not build specialised extraction screens for every announcement category. |
| Pull research | A short business context followed by a focused answer, supporting evidence, and a clearly stated unknown or limitation when relevant. Offer two suggested questions plus one bounded company-question input. | Gives the investor a useful response without building all eight research panels or a general assistant. Suggested questions: "What is management's stated outlook?" and "What risks or constraints does management identify?" |
| Research sources | Start with the latest available annual report and latest available earnings-call transcript; show their periods. Retrieve relevant passages from both document types as appropriate to the question. Company disclosures may supplement them. | Bounds initial document work while preserving the required foundations. An older report must not be presented as current. No broker notes, news, research reports, or model-memory company facts as pull evidence. |
| Evidence | Clickable source markers open a shared evidence view with document title, period, page/section, supporting passage, and original link. Source-linked figures retain their units and reporting basis. | Makes grounding inspectable and supports phone use. Evidence is part of the main journey, not a separate report library. |
| Unfamiliar companies | NSE ticker entry resolves a company and uses the same discovery, retrieval, and research path outside the selected sets, wherever the required data is available. | Mandatory generalisation remains in scope. Company-name search and arbitrary BSE-only research are deferred conveniences; NSE support is not restricted to the 15 holdings or three demos. |
| Delivery | A responsive web prototype accessible by link on a phone. | A single delivery route avoids native packaging work. No framework, hosting provider, or model has been selected in this entry. |

The initial annual-report/transcript selection limits research depth, not ticker coverage. A question that cannot be answered from the retrieved documents should receive a bounded, honest answer identifying the missing evidence. Failure to fetch or parse an available source must be surfaced as a processing problem, not relabeled as "no data exists."

### Essential screens

1. **Portfolio inbox.** Portfolio identity, selected period, prioritised cards, collapsed routine items, research entry, and a compact data freshness/coverage disclosure. Cards show the company, change, reason for attention, filing time, and dated EOD context. A failed fetch must be distinguishable from a quiet period.
2. **Change detail.** The selected disclosure, concise explanation, source excerpt/link, and **Research this company**. Back returns to the same inbox position and period.
3. **Company research.** Resolved company identity and NSE ticker input, document periods, suggested questions, a bounded question field, concise sourced output, and evidence access. This screen works both from an inbox item and from an independently entered ticker.

**Shared evidence sheet:** Reuse one mobile-friendly overlay from filing detail and research. Show the supporting passage and offer the original document; a robust page/section link is sufficient if an embedded PDF viewer would delay delivery.

Loading, partial-data, unavailable-document, invalid-symbol, and source-failure states belong inside these screens. Do not add separate onboarding, settings, document-library, or admin screens. On mobile, keep the answer readable before expanding long evidence; verify at 360, 390, and 430 CSS pixels and on a real phone.

### Two-minute demo journey

Use one real, informative portfolio disclosure selected after source checks. Any cached documents or computed research must come from the functioning pipeline, with dates visible. Select the 7-day window explicitly if the last 24 hours are quiet. The timed journey demonstrates the core workflow; it does not claim a cold document download always completes within two minutes.

| Elapsed time | Investor action | What the evaluator sees |
| --- | --- | --- |
| **0:00-0:20** | Open FINN on a phone and scan the inbox. | One item deserves Review, a reason explains its rank, routine items are collapsed, and the selected period and EOD date are visible. |
| **0:20-0:45** | Open that item and inspect the disclosure. | What changed, why it merits attention, the original exchange filing, and separately dated market context. |
| **0:45-1:20** | Tap **Research this company**, then choose a suggested question. | A compact response grounded in actual annual-report/transcript evidence, with reporting periods and source markers. |
| **1:20-1:45** | Open a source marker. | The supporting passage, document identity, page/section, and original link. Verify one substantive claim rather than reading a long generated report. |
| **1:45-2:00** | Return to research and enter the selected ad-hoc NSE company outside the portfolio. | The same screen resolves the new identity and opens its sourced research using the normal engine. Genuine cached documents may keep this transition short. |

The last step demonstrates research beyond holdings, **not proof of arbitrary ticker support**. Before submission, separately complete end-to-end tests on at least two valid NSE tickers absent from the portfolio, demo set, and local document cache, with sources known to be available. Confirm acquisition, source identity, and a grounded answer without code changes or manually supplied company documents. A loading indicator alone does not pass this check. Cold retrieval may take longer than the presentation journey; its processing state must remain clear.

### Deliberate omissions and reasons

| Omit from this version | Reason |
| --- | --- |
| OS push notifications, email alerts, configurable price/volume thresholds, intraday streaming | The in-app inbox proves push; delivery channels and alert-rule management add infrastructure without strengthening the core journey. EOD data remains fully in scope. |
| Full announcement taxonomy and bespoke treatment of every category | A few explainable priority decisions and source access are sufficient. Unknown types remain visible rather than silently buried. |
| LinkedIn biographies and management-background enrichment | Optional and introduces another retrieval/identity problem. |
| Automatic Revenue/EBITDA/PBT/PAT comparison panels and full four-quarter promises-versus-delivery analysis | Cross-period extraction, restatements, and reporting-basis alignment add significant verification work. These remain attractive next steps after the evidence flow works. |
| All eight research panels, exhaustive multi-year backfills, valuation models, and a separate bull/bear report | Keep research focused on the question and available primary evidence. Do not turn a compact workflow into a broad financial terminal. |
| Open-ended general chat, persistent conversation memory, voice, and multi-agent research orchestration | A company-focused question input demonstrates pull without another product surface or complex conversation behavior. |
| Portfolio editing, live holdings import, brokerage connections, trading actions, and user accounts | A single fixed mock portfolio is sufficient for the assessment. |
| Native mobile packages, charts, custom PDF rendering, extensive animations, and decorative dashboards | Prioritise phone readability, reliable source navigation, and a working link. |
| Company-name search and generalised BSE-only research | NSE ticker entry satisfies the explicit unfamiliar-company requirement. This does not remove data coverage for any BSE-listed holding chosen for the mock portfolio. |

**Protected scope:** Do not cut either interaction mode, any of the three data source families, the 15-company portfolio, unfamiliar NSE support where data exists, primary-source discipline, phone usability, or the required submission materials to make room for illustrative features.

### Delivery plan before November 1

These are proposed work blocks, not completed milestones or validated duration estimates. Build a usable candidate on October 31 and leave the final block for verification and submission preparation.

| Work block, India time | Result to establish | Stop / cut decision |
| --- | --- | --- |
| **October 30, first two working hours** | Prove real EOD acquisition, portfolio exchange-filing access, annual-report and transcript retrieval, and a cold NSE company outside the demo selections. Get at least one grounded research answer. | If a provider fails, try an equivalent permitted source or company IR before investing in UI. Keep source-access and parsing failures distinct from unavailable data. Reassess feasibility immediately if core access is unresolved. |
| **October 30, remaining evening** | Connect one actual filing -> detail -> research -> evidence journey, with a thin mobile interface. | Cut visual extras and optional response sections. Do not replace real acquisition with demo-only fixtures. |
| **October 31, morning** | Extend collection to all 15 holdings, establish the three ad-hoc demonstrations, and finish inbox grouping, windowing, and coverage/error states. | Spend remaining feature time on coverage and correctness; freeze additional product features. |
| **October 31, afternoon** | Deploy the candidate; complete phone checks, source verification, and cold unfamiliar-ticker checks. | Fix broken core paths before refining presentation. Cached demo success cannot substitute for cold-test success. |
| **October 31, evening** | Prepare and verify the prototype link, GitHub link, AI build-history exports/share links, and covering note; make the package ready before November 1. | Preserve a buffer for access or deployment problems. Submission itself is a later action, not part of this scope-writing step. |

If time slips, reduce answer length and breadth, use simple styling, and link to original PDFs rather than building a viewer. Keep the three screens functional and the evidence truthful. If mandatory source access or unfamiliar-company research remains broken, record the shortfall plainly; a narrower-looking demo does not make those requirements optional.

### Completion checks for this chosen scope

- A reviewer can complete the planned core journey on a phone in about two minutes using genuine source material.
- The inbox accounts for collected filings in its selected window, explains priority, and lets the user inspect routine items and data gaps.
- All 15 holdings have exercised EOD and exchange-disclosure acquisition paths; empty periods and failures are explicit.
- Research supports annual reports and transcripts, uses primary evidence only, and makes substantive claims inspectable.
- Independent NSE ticker entry and completed cold tests establish that the engine is not hard-wired to the demonstration companies.
- The deployed route, GitHub access, AI build history, and covering note are checked against M-12 through M-17 in REQUIREMENTS.md. The eventual submission is to `assessment@enam.com` with subject `ENAM - IIT screening - 2027`.

No application behavior or delivery milestone in this log has been marked complete. The next implementation step, when requested, should test the risky data paths before expanding the interface.

## 2026-10-30 - Real-source feasibility check

**Action:** Tested real acquisition before architecture selection. Full evidence and practical alternatives are recorded in [DATA_PROBE.md](/Users/tusharjain/Downloads/enam_submission/DATA_PROBE.md) and the [source registry](/Users/tusharjain/Downloads/enam_submission/data_probe/manifest.json).

**Observed successes:** Yahoo returned 21 INFY daily OHLCV rows through October 30, 2026; NSE returned 2,947 INFY announcements and original results/transcript PDFs; the Infosys FY2025-26 annual-report PDF downloaded and parsed. CERA was reserved outside the future demo set and its Screener page led to an original FY2025-26 annual report and Q1 FY2026-27 transcript. A company-IR copy of that transcript matched the BSE copy's hash. Original URLs, resolved URLs, periods, access timestamps, files, and checksums are saved.

**Observed failures:** Initial restricted-network DNS failures cleared after the required permission. Separately, two Infosys navigation pages returned actual HTTP 403 responses while its direct annual PDF and NSE-hosted filings succeeded. An initial CERA link filter missed the generic Transcript anchor; inspecting its Raw Transcript title corrected it. These are distinct failure types, not evidence that the underlying company data was absent.

**Scope/architecture implications:** Retain the inbox-to-research direction. Prefer a small server-side collector with source-specific discovery and original-document caching; do not depend on a single IR landing page. Keep physical page/section references: the actual Infosys earnings call starts on PDF page 24 of a combined media/earnings filing, and its results attachment downloaded as 26.72 MB despite a smaller listed size. These findings support caching and clear processing state, not a complex platform.

**Still unproven:** Portfolio-wide coverage, rate behavior, deployment-host access, official reconciliation of Yahoo closes, a general NSE company resolver, automated discovery across arbitrary companies, and evidence-backed answer generation. One cold CERA acquisition is a useful feasibility result, not completion of M-06. `yfinance`, official EOD/bhavcopy fallbacks, and a complete BSE announcement feed remain untested alternatives. No application architecture or framework is committed by this check.

## 2026-10-30 - First running filing-to-evidence slice

**Stack chosen:** React 19, TypeScript, plain CSS, and Vinext server routes using the Sites Worker runtime. Original PDFs and a page-aware JSON corpus are prepared from the verified downloads. The server retrieves passages; the browser receives only catalog data and requested evidence. No database or vector service is needed for this slice. Details are in [ARCHITECTURE.md](/Users/tusharjain/Downloads/enam_submission/finn-app/ARCHITECTURE.md).

**Implemented:** A responsive inbox, filing detail, company research view, and shared evidence dialog. A user can inspect the actual Infosys results disclosure, open the full original or a clearly labeled cached excerpt, inspect physical-page evidence, choose Infosys or TCS, and submit a question. Loading indicators, retryable failures, insufficient-evidence messages, empty time windows, and company-switch cancellation are included. Source dates and the partial snapshot coverage are visible.

**Grounded response decision:** No model API key is configured. The working endpoint therefore returns a clearly labeled **Source extract**, using question-guided retrieval over primary annual-report/transcript pages, with the original URL, reporting period, and exact physical page. It does not pretend to be model-generated analysis. For example, the Infosys outlook question retrieves its Q2 FY27 revenue-growth guidance from PDF page 26; the TCS outlook response preserves management's statement that it does not provide specific revenue/earnings guidance, from PDF page 3. The engine excludes media-call pages and later analyst Q&A from transcript retrieval to avoid attributing an analyst's question to management.

**Connected coverage:** Two companies, five selected real filing records, and 629 extracted primary-document pages. TCS was discovered through Screener and its original BSE transcript downloaded and cached. CERA remains outside the demo selector. This is a dated source snapshot, not a complete 15-company live portfolio. TCS annual-report/EOD coverage, arbitrary NSE discovery, background refresh, a third demo company, and generative analysis remain outstanding for the wider assignment.

**Key handling:** The current app requires no provider key. Environment/secret files are ignored and unavailable as public routes; `.env.example` contains no secret. The page corpus is server-only and absent from the client build. Requests accept registered company/document IDs, not arbitrary URLs or filesystem paths. JSON sizes are bounded, cross-origin mutations are rejected, and unexpected errors return a generic message without stack traces or environment values. Any future model key belongs in server runtime secrets, never a browser-public environment variable.

**Verification completed:** TypeScript check passed, 13 retrieval/input/security tests passed, and a cleanly started local production Worker passed all 13 HTTP integration checks. Checks include the rendered root and client asset, real filing evidence, both companies' sourced responses, exact citation pages, unsupported/unknown inputs, invalid JSON and oversized requests, cross-origin rejection, original PDF signatures, and inaccessible secret/corpus routes. The production build succeeded. Results and precise limits are in [VERIFICATION.md](/Users/tusharjain/Downloads/enam_submission/finn-app/VERIFICATION.md).

**Findings corrected during verification:** The annual-report shelf initially pointed to a blank cover; it now opens the verified Board report on PDF page 33. Retrieval initially favored an analyst question and generic risk boilerplate; prepared-remarks boundaries and substantive-topic ranking corrected those cases, with tests against the actual downloaded corpus. The development source-data route was blocked explicitly. An oversized-body check and source rebuilds exposed a stale local Worker runtime; bounded body reading plus a clean production restart passed the consecutive-request checks.

**Run result and external limits:** The verified production preview runs at `http://127.0.0.1:8787` on this computer. Browser automation continued to report that local browser use was disabled, including after a session refresh; visual phone-layout, keyboard, focus, and touch testing have **not** been certified. A private Site was registered and its exact ID persisted, but subsequent credential refresh and project lookup both returned `Sites project not found`. No duplicate Site was created, no deployment was reported successful, and the expected hosted URL is not presented as live. Local source and build remain available for resuming publication when Sites access is restored.

## 2026-10-30 — Portfolio ingestion and durable refresh

**Scope:** Expanded collection to 15 verified NSE-listed companies across 13 sectors and qualitative size bands. Selected INFY, TCS, ITC and APLAPOLLO as four independent research examples. Company identity comes from the complete NSE equity directory; list membership is applied after identity resolution. CERA and HAVELLS were cold-tested outside both lists, followed by VGUARD through the running app.

**Observed acquisition:** Yahoo daily price/volume plus NSE exchange-announcement requests succeeded for all 15 holdings in the recorded run. The result holds 315 daily observations, 200 distinct 30-day filings, seven original annual-report/transcript PDFs and 1,648 indexed pages. Prior source-probe records retain their actual publication dates; one filing outside the current 30-day window remains explicitly marked historical. A cached repeat preserved the collector's filing, document and page IDs. Forced MARUTI price/announcement refresh succeeded. Detailed original URLs, reporting periods, failures and access dates are in [the acquisition report](/Users/tusharjain/Downloads/enam_submission/finn-app/ingestion/REPORT.md).

**Actual gaps and corrections:** TATAMOTORS gave Yahoo 404 and was absent from the current NSE directory; configured automotive exposure is now MARUTI. ITC has a verified FY2025–26 annual report, but no transcript link was found, so the app marks document coverage partial. BSE `AnnPdfOpen` produced HTTP 406; same-attachment physical PDF URLs succeeded for the cold holdouts, with original viewer URLs and failures retained. Initial Screener rate limits led identity resolution to the official NSE directory while Screener remains a paced document-discovery index. Size bands remain explicit qualitative selection labels.

**Built:** Generated a Drizzle D1 schema and migration. D1 now stores companies, filings, document metadata, extracted pages, source states, jobs and HTTP discovery/cache records; R2 stores originals. The private import API checks a local/server-only bearer secret, strips private collector file paths, verifies original-PDF hashes, and chunks page imports. Older cached imports cannot roll back newer market/source status, and changed file bytes keep old citation versions. The collector uses a local SQLite response/attempt cache and content-addressed raw files.

The inbox now filters current filings by actual dates and membership, prioritizes Review items, and offers historical records separately. It shows per-source fetch time, data date/period, stale/error states and partial document coverage. Refresh starts or resumes a persisted job with independent EOD and announcement tasks. It completed all 30 tasks for the 15 holdings in the running Worker. An arbitrary ticker can be resolved without consulting either curated list; discovered but unindexed PDFs are labeled and cannot produce a fake research answer. Four examples plus CERA and HAVELLS returned evidence-backed source extracts; VGUARD showed the explicit pending-index state.

**Verification:** TypeScript and production build passed; 24 Node tests and seven collector tests passed. Nineteen HTTP checks passed against the restarted local production Worker. Reimporting the cached full batch left counts unchanged. At a narrow in-app viewport (354 CSS px measured) the app had no horizontal overflow, and the ITC research response opened annual-report evidence at PDF page 67. `README.md`, `ARCHITECTURE.md`, `INGESTION.md` and `VERIFICATION.md` describe the current implementation and limits.

**Delivery limit:** The existing Site ID remains in `.openai/hosting.json`, but Sites still returns `project not found`. No duplicate project or false deployed link was created. Local D1/R2-backed runtime is available at `http://127.0.0.1:8787`; hosted bindings/data seeding remain unverified. The local preview uses an ignored random `.dev.vars` key and persists local data under ignored `.wrangler/state`.

## 2026-10-31 — Investor digest, EOD alerts, and cited research

**Built:** The digest defaults to the latest 24 hours, with 7-day and 30-day choices. Review/Watch/Routine ordering has visible reasons, and routine exchange filings remain in an expandable drawer. A board meeting notice is distinct from an actual results outcome. The alert panel exposes browser-saved price and volume settings, independent enable switches, and data coverage.

**Alert policy:** Default trigger is an absolute EOD close move of at least 5% versus the previous valid NSE session, or a session volume of at least 2× the mean of the previous 20 valid sessions. The session under review is excluded from its baseline; insufficient or zero baselines do not become substitute values. Windows use the NSE close instant in Asia/Kolkata, include their exact start boundary, and exclude future sessions. Alert keys use symbol/session/kind to make repeat checks deterministic. Market history upserts retain the newest acquisition for a duplicate session. The initial 315-row portfolio history is provenance-linked; 15 holdings each have 21 observations, and the current 24-hour query returned one alert.

**Research:** Responses classify a supported passage as a reported fact or a management statement and keep calculations, inference, and missing evidence in separate fields. Figures and reporting periods remain as printed. Citation cards open the corresponding source passage and expose the original PDF link, physical page and period. Annual-report and earnings-call tests cover those fields separately. Ticker resolution remains independent of both curated lists; cold-acquired CERA and HAVELLS returned primary-source answers after the same collector/index/import path. Runtime-discovered links can remain unindexed until the documented collector/import step completes, and the UI states that limitation.

**Verification:** Production build and TypeScript typecheck passed; 33 Node tests and seven Python tests passed. All 20 running-worker checks passed against the refreshed `127.0.0.1:8787` preview. Checks include repeated alert IDs, changed thresholds/periods, filing classification, exact time boundaries, no-data/short-baseline cases, older-history nonrollback, annual/transcript citations, and out-of-list CERA/HAVELLS responses. Browser automation again reported local browser access disabled in Work settings, so visual phone QA was unavailable this turn.

The post-build live refresh also completed all 30 price and NSE-announcement tasks with zero failures. Cold and cached VGUARD resolution remained independent of the portfolio and research-example lists; the full HTTP suite passed again after refresh.

## 2026-10-31 — Source-backed quarterly comparison and delivery check

**Enhancement selected:** The connected Infosys board-outcome PDF has a same-basis consolidated IFRS table on physical page 6, covering Q2 FY27, Q1 FY27 and Q2 FY26 in ₹ crore. A compact detail view now shows Revenue, Operating profit, PBT and Net profit after non-controlling interests. It preserves the source-reported QoQ/YoY percentages and omits EBITDA, which is not separately reported in that table. An endpoint verifies its indexed page, units, date headers and ordered rows before returning anything. Four-quarter guidance-versus-delivery remains excluded because four matched guidance/outcome periods are not connected.

**Checks:** 35 Node tests, seven Python tests, TypeScript typecheck, production build and 22 Worker HTTP checks passed. CERA/HAVELLS research and invalid-NSE resolution checks remain in the suite. Actual public deployment has not passed: the agreed OpenAI Sites project previously returned `Sites project not found`, and this environment exposes no Sites publishing operation. No alternate host or unverified public URL is claimed. Local reproducible commands are in `README.md`.


## 2026-11-01 — Netlify release follow-up

The user deployed the snapshot at [finn-investor-inbox.netlify.app](https://finn-investor-inbox.netlify.app/). A live browser check confirmed the public home page, dated collection banner, catalogue, INFY EOD context, unavailable alert state, and two-company research selector. A submitted INFY outlook question failed with “Please send this request from FINN.”

**Correction prepared:** Netlify forwards the external request host while the app may receive an internal URL. The research guard now accepts a matching forwarded/request host and checks the forwarded protocol when available. Production build passed; a local production request returned a cited INFY answer with Netlify-style headers and still rejected a foreign origin. The change is prepared in the source tree but **has not been pushed or deployed**.

**Public handoff status:** signed-out GitHub returned 404 for the configured repository remote, so public reviewer access is not verified. The AI history share displayed the full conversation when opened signed in; signed-out access and a hands-on phone walkthrough remain outstanding. The email draft is in `COVERING_EMAIL_DRAFT.md` and remains unsent.


### Post-push verification — 1 November 2026

The user pushed commit `8eee46c` and Netlify is now serving the origin-check correction. Live INFY and TCS research both returned cited management statements; the INFY citation opened the source passage, the local transcript asset returned HTTP 200, and the quarterly comparison loaded. Unsupported analyst-price-target and unbundled HINDALCO inputs produced explicit evidence-gap/not-in-snapshot states. The default 24-hour window was empty; the 30-day view showed the bundled historical filings. Remaining release limits: dated two-company snapshot, no refresh/price-alert history, signed-out GitHub 404, and no physical phone QA.

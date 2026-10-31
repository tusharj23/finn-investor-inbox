# FINN acceptance evaluation — October 31, 2026

## Scope and access

Evaluation used the running local production Worker at `http://127.0.0.1:8787`, its real D1/R2 corpus, the exchange/market collector, unit tests, and HTTP checks. The desktop CUA/browser inventory reported `Local browser use is disabled in Work settings`; therefore this run could not perform the requested 30-second visual phone walkthrough. Visual layout, actual keyboard behavior, and touch use are reported as **not visually verified**, rather than passed. Source-level responsive checks and changes are listed below.

## Push journey: notice, understand, inspect

The portfolio is 15 NSE holdings. The digest defaults to 24 hours, offers 7 and 30 days, orders Review/Watch/Routine with reasons, and leaves routine disclosures in an expandable drawer. Opening a filing leads to its rationale, original exchange filing, evidence passage when indexed, and a direct **Research this company** action. Source freshness and errors remain available in the coverage panel.

The current 24-hour EOD run returned one alert: **SUNPHARMA**, volume **3.42×** its mean volume of **1,497,589.7 shares** over the 20 preceding sessions, for session date **October 30, 2026**. The API returned coverage for all 15 holdings and no missing baselines. Repeating the same request returned the same unique alert IDs. Changing period and threshold changed the returned settings and calculation window.

## Pull journey: ticker, question, evidence

Company research supports selecting a connected company or entering an NSE ticker. Selecting a source document opens its passage and original URL. Answers show the source period and PDF page, identify a reported fact or management statement, and keep calculations and inference separate. A quote-to-passage check compared the answer's quoted text to the selected passage and checked that the evidence endpoint returned the same document URL and physical page.

Cold-collected **CERA** and **HAVELLS** are outside the portfolio and example lists. Both returned extractive responses tied to indexed primary documents through the generic collector/import path. Annual-report and earnings-call examples were separately checked for period/page/original-URL retention.

## Acceptance run

| Scenario | Observed result | Status |
| --- | --- | --- |
| Push digest, default and alternate periods | 24-hour default plus 7-day and 30-day options; priority reasons shown; routine records retained | Pass |
| EOD price and volume | 15 companies, 315 persisted EOD rows; 20-session volume mean excludes the current session; inclusive thresholds tested | Pass |
| Refresh, duplicate alerts | Live 30-task price/NSE refresh completed with 30 successes and zero failures; repeated alert request returned stable unique IDs | Pass |
| Date boundaries | Exact rolling cutoff included; immediately older and future filings excluded; future EOD sessions excluded | Pass |
| Missing price/history | No data, missing prior close, zero baseline and fewer than 20 observations are explicit; no zero/short baseline substituted | Pass |
| Results versus meeting notice | Future board meeting is Watch/Meeting notice; approved results outcome is Review/Results released; routine newspaper notice remains Routine | Pass |
| Unfamiliar ticker | CERA and HAVELLS cold acquisition plus research worked outside both lists; VGUARD resolved cold/warm without duplicate discovery links | Pass, with collector import needed when discovered PDFs are not indexed |
| Invalid ticker | `NOTREAL123` rejected against the NSE directory with HTTP 400; company count unchanged | Pass |
| Missing documents | ITC annual report is connected and its missing transcript is marked partial; VGUARD's discovered PDFs remain explicitly unindexed and research returns `documents_unindexed` | Pass, limitation disclosed |
| Unsupported question | A Bitcoin-price question for INFY returned HTTP 422 insufficient evidence | Pass |
| Stale prices/source failure | Unit tests set an aged last-success timestamp and reported stale status. Simulated upstream `URLError` preserved the last cached bytes and exposed the refresh error. No live source outage was induced in this run | Pass (simulated) |
| Duplicate filings/imports | Repeating the same import is idempotent; 216 stored filing IDs had no duplicate IDs after refresh | Pass |
| Claim citations | Annual report and transcript responses retained period, original URL, PDF page, and answer quote in the cited passage; holdout-company HTTP answers passed the same identity/page checks | Pass for tested extracts |
| Upstream failures | Collector cache retained last successful source on forced failure; app refresh retains last-good records and marks failed tasks | Pass (simulated collector failure; live refresh had no failures) |

## Enhancement selected: one source-backed quarterly comparison

The collected [Infosys board outcome and results filing](https://nsearchives.nseindia.com/corporate/Infosys_23102026160704_BM_Outcome_Oct232026_1.pdf), physical PDF page 6, contains a consolidated IFRS fact-sheet table in ₹ crore with Q2 FY27, Q1 FY27, and Q2 FY26 columns. The app now presents those figures on the INFY results filing detail. QoQ and YoY percentages are copied as source-reported and labeled as such; no calculations are added.

| Metric | Q2 FY2026–27 | Q1 FY2026–27 | Q2 FY2025–26 | QoQ (source) | YoY (source) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Revenue | 49,244 | 48,211 | 44,490 | 2.1% | 10.7% |
| Operating profit | 10,330 | 10,163 | 9,353 | 1.6% | 10.4% |
| Profit before income taxes | 11,063 | 11,028 | 10,229 | 0.3% | 8.2% |
| Net profit after non-controlling interests | 7,823 | 7,769 | 7,364 | 0.7% | 6.2% |

The endpoint rechecks the actual indexed source page, period headers, units, and each ordered row before serving figures. If that evidence is absent or mismatched, it shows no comparison. EBITDA is explicitly omitted because this table does not report it; it is not approximated from operating profit. The filing notes that rounded quarter values may not add to half-year totals. The four-quarter guidance-versus-delivery view is excluded: the currently indexed transcripts/results do not provide four matched guidance and outcome periods across one company.

## Phone, dense content, and accessibility review

The phone-specific CUA inspection remained blocked by Work settings, so long-name rendering, actual tables in the PDF viewer, on-screen keyboard behavior, loading transitions, and touch use were not visually exercised on a device. Static review and implementation checks found:

- Narrow layouts collapse the digest/research columns to one column. Filing titles, company names, source titles, and citation titles now permit wrapping without widening the viewport.
- Alert labels, disclosure summaries, period select, suggestion buttons, and settings inputs have at least 44 CSS-pixel targets. Navigation and main actions are at least 44 pixels high.
- Ticker, question, company select, and numeric inputs use 16px text on narrow screens to avoid iOS focus zoom. Keyboard focus has a visible outline; loading and error messages use status/alert roles.
- Primary-document table layouts are opened as original PDFs; the app does not attempt to rebuild financial tables as responsive HTML. The evidence passage remains scrollable and the original document link is available.

## Fixes made during evaluation

- Source review showed the alert controls ahead of the chosen digest. Reordered the screen so the investor sees prioritized portfolio changes before configuring alert rules.
- Added responsive alert settings/results and claim-classification styles.
- Increased small disclosure and settings controls to phone-sized hit areas, and allowed long company/document names to wrap.
- Expanded automated checks to reject a fake NSE ticker, verify real source links/pages and quoted passage support, confirm ITC's partial document state, and repeat alerts after refresh.
- Protected historical EOD rows from stale same-session imports replacing newer observations.
- Added a narrow quarterly comparison only where the existing indexed primary page provides all three comparable periods, same-basis figures, and source-reported growth.

## Verification and remaining limits

- Production build, TypeScript typecheck, **35 Node tests**, **7 Python tests**, and **22 running-worker HTTP checks** passed.
- CUA/browser access is still disabled, so the 30-second visual investor pass and hands-on phone keyboard/touch checks remain outstanding.
- Newly discovered PDFs can need the documented collector/import step before runtime research has indexed passages. An exchange link alone is not treated as readable evidence.
- The research engine returns source extracts; it does not calculate financial ratios or independently assess management statements. Unsupported or unavailable evidence remains an explicit gap.

## Hosting status

The agreed route is OpenAI Sites, with the existing project ID preserved in `.openai/hosting.json`. The last recorded Sites lookup returned `Sites project not found`; this turn's tool inventory did not expose a Sites publishing operation. No alternate host was substituted. **Verified public URL: none.** The reproducible local route is in [finn-app/README.md](finn-app/README.md), and the preview remains at `http://127.0.0.1:8787` on this computer. Since no public deployment exists, hosted persistence, public source links, external refresh, and phone workflows against a public app remain unverified.

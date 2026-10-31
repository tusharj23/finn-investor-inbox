# FINN: Assignment requirements and acceptance criteria

Status: requirements analysis only. No implementation, technology selection, deployment, or submission is authorized by this document.

## 1. Sources and interpretation

Both PDFs were read in full, including visual inspection of every page:

- **M**: [ENAM AI Engineer Build Challenge - Main](/Users/tusharjain/Downloads/enam_submission/1.%20ENAM_AI_Engineer_Build_Challenge_Main.pdf), pages 1-4.
- **R**: [Reference: Announcement Categories & Financial Glossary](/Users/tusharjain/Downloads/enam_submission/2.%20ENAM_AI_Engineer_Build_Challenge_Reference.pdf), pages 1-3.

Page references below use these identifiers. These PDFs are the assignment authorities; recommendations in this document are not additional ENAM instructions.

| Classification | Meaning |
| --- | --- |
| **Mandatory (M-xx)** | An explicit assignment obligation. Acceptance criteria translate it into observable checks. |
| **Illustrative (I-xx)** | A suggested feature, example, or optional menu item. It is not a submission gate unless deliberately selected for the prototype. |
| **Recommended (REC-xx)** | Our proposed approach or verification detail. Numeric targets in this category are ours, not thresholds stated by ENAM. |

The brief explicitly calls the frontend examples "illustrations, not a checklist" (M p. 2), and the eight pull outputs a menu (M pp. 2-3). The reference taxonomy may be used, adapted, or ignored (R p. 1). Conversely, the opening definition calls for both push and pull (M p. 1), and the backend directs us to get all three sources working (M p. 2). A small scope does not remove those core obligations.

## 2. Assignment and evaluation

- **Product:** FINN, a mobile-first financial investment agent for a public-markets investor's daily workflow.
- **Problem:** Filter information so the investor sees consequential changes and saves time, rather than merely aggregating a large feed.
- **Release date:** Tuesday, October 27, 2026 (M p. 1).
- **Deadline:** Sunday, November 1, 2026 (M p. 1). The PDFs specify no cutoff time or timezone; do not invent an 11:59 p.m. deadline.
- **Evaluation:** Creativity, product sense, judgment, architecture, and how the builder works. Concise presentation, information density, design, and interactivity matter. Completeness and polish are not the grading target (M pp. 1, 3-4).
- **Scope guidance:** A focused, working prototype proving one or two workflows is preferred to a broad, broken demo. Build the smallest convincing version (M p. 4).

## 3. Mandatory product and coverage requirements

The criteria below are future acceptance checks, not claims that anything has already been built or tested.

| ID | Requirement | Testable acceptance criteria | Source |
| --- | --- | --- | --- |
| M-01 | Deliver a working, mobile-first prototype. | On a phone, an evaluator can open the supplied delivery route, navigate the product, and complete the selected push and pull workflows. The demonstration runs end to end and is interactive. A static mockup or a desktop-only experience fails. Concrete viewport and touch-size checks are recommended in REC-02. | M pp. 1, 3-4 |
| M-02 | Support push: proactively communicate what changed and why it matters. | After a relevant portfolio change enters the system, the product surfaces it and its relevance without requiring the investor to ask for research on that item. Demonstrate the chosen prioritization or filtering behavior. A particular digest, alert transport, or operating-system notification is not prescribed. | M pp. 1-2 |
| M-03 | Support pull: on-demand company research or analysis grounded in fundamentals. | The user requests research through the chosen interaction model and receives a useful response based on retrieved company documents. The response addresses the request and selected research scope; it is not a fixed company profile replayed for every query. Both annual reports and transcripts must be supported by the research pipeline; an individual answer may use whichever documents are relevant. | M pp. 1-3 |
| M-04 | Choose a mock portfolio of 15-20 NSE/BSE-listed companies. | The configured portfolio contains 15-20 distinct listed companies, with identifiable company names and exchange symbols. The portfolio drives the price/volume and announcement coverage in M-07 and M-08. A mix of sectors and sizes is encouraged; no sector or size quotas are specified. | M p. 1 |
| M-05 | Choose a handful of companies for ad-hoc research demonstrations. | A named, small demonstration set exists, and on-demand research can be exercised for it. The brief suggests 3-5 companies; that is an approximate target, not an exact mandatory count. These companies may overlap the portfolio or be outside it. | M p. 1 |
| M-06 | Generalize research beyond the chosen demo companies. | An evaluator can supply a valid NSE ticker absent from both selected company sets. Where annual reports and transcripts are available, the same engine resolves the company, obtains relevant documents, and produces grounded research without a code change, a company-specific answer template, or manual preparation of that company's research. Inspect for a fixed demo allowlist or hard-coded company answers. | M p. 2 |

The unfamiliar-ticker requirement is explicitly for **any NSE ticker where data is available**. It is not satisfied by adding a few more seeded companies. Generalized BSE-only research is not expressly required; BSE-listed portfolio holdings remain within the portfolio requirement.

## 4. Mandatory data sources: all three must work

| ID / source family | Required data and coverage | Testable acceptance criteria | Provider flexibility and limits |
| --- | --- | --- | --- |
| **M-07: Price and volume** | End-of-day market data for the configured portfolio. EOD means daily closing price and traded volume after market close (M p. 2; R p. 3). | Exercise the acquisition path for the portfolio. Inspect sourced records containing the correct company, trading date, closing price, and volume. Verify sample values against the provider's corresponding day. A price-only feed or invented demonstration values does not satisfy this source. Coverage gaps must be identified during verification rather than counted as successful acquisition. | Yahoo Finance and Python `yfinance` are suggestions; equivalent public sources are allowed. For Yahoo, NSE uses `.NS` and BSE uses `.BO`. Intraday streaming is not required. |
| **M-08: Corporate announcements / filings** | NSE/BSE disclosures for the portfolio companies (M p. 2; R p. 2). | Exercise collection for the portfolio and inspect actual exchange-origin disclosures matched to the correct companies. Follow sample records back to their underlying filings. Verify that the chosen push workflow consumes this source. A news feed alone is insufficient. | The reference's classification is optional. The brief does not expressly require duplicate collection from both exchanges for every dual-listed company, a particular exchange API, or a fixed historical backfill. |
| **M-09: Company fundamentals** | **Annual reports and concall / earnings-call transcripts**, located through Screener links or the company's investor-relations site (M p. 2). | Retrieve and process actual annual reports and actual transcripts; demonstrate research using the two document types, including the unfamiliar-company path in M-06. Merely displaying links without using their contents does not ground research. Verify document identity and reporting period against the source. | Screener is an allowed discovery route; company IR is an explicit alternative. A standardized financial table alone does not replace the annual-report and transcript pipeline. Other primary company disclosures may supplement these documents, not replace both required types. |

Three source families do not mean three specific vendors or three mandatory services. The brief specifies the kinds of data and provenance, while leaving implementation open. Real data may be cached; cached examples alone do not establish that acquisition works or that unfamiliar companies are supported. The PDFs do not specify a polling interval, historical depth, or uptime target.

## 5. Mandatory research discipline

| ID | Requirement | Testable acceptance criteria | Source |
| --- | --- | --- | --- |
| M-10 | Ground pull research in primary annual reports and transcripts. | For demonstrated pull runs, inspect the retrieved evidence and trace factual company claims and figures to the underlying company documents. Derived calculations must be reproducible from those inputs. The research pipeline supports both required document types. Visible citations are recommended in REC-03; the brief does not dictate a citation format. | M p. 3; R p. 2 |
| M-11 | Exclude secondary commentary and the model's outside company knowledge from pull evidence. | Inspect pull retrieval inputs, prompts, and output evidence. Broker notes, news, research reports, and model-memory company facts are not used as evidence or to fill gaps. General language and reasoning ability may be used to analyze supplied documents. | M p. 3; R p. 2 |

Primary versus secondary is about the origin of the content, not only the hostname. A company report linked through Screener remains primary; Screener's presence in the brief does not make every third-party summary acceptable evidence. A company-issued filing is primary, whereas a journalist's account of it is secondary.

The brief expressly permits **push-side enrichment**, such as an incoming executive's professional background. That permission does not extend the pull research evidence policy. Missing primary data must not be treated as permission to substitute a broker summary or model memory; the proposed user-facing handling is REC-05.

## 6. Illustrative features: optional scope, with conditional checks

The checks in this section apply **only if a feature is selected**. Omission of these particular examples is not an assignment failure. The high-level push and pull obligations still apply.

| ID | Illustration | Conditional acceptance check if chosen | Source |
| --- | --- | --- | --- |
| I-01 | Windowed portfolio digest. | Default to the last 24 hours, allow the user to change the period, account for filings across the portfolio in that period, prioritize material items, and collapse or hide routine items. Verify period boundaries and that hidden routine items are accounted for. | M p. 2 |
| I-02 | Triggered material-announcement or EOD anomaly alerts. | Exercise a material announcement and/or an EOD price or volume rule, including a boundary case. If implementing the suggested configurable rules, changing a threshold changes triggering behavior. About 2x recent average volume and a daily move beyond +/-X% are examples, not fixed required defaults. Define the recent-average period if used. EOD alerts operate when new EOD data arrives; this example does not impose an intraday feed. | M p. 2 |
| I-03 | Incoming management background. | A management-change item can show a short, sourced background for the incoming person. LinkedIn is an example source, not a mandated integration. Keep the identity matched to the filing. | M p. 2 |
| I-04 | Quarterly results first cut. | Use the actual results filing to show Revenue, EBITDA, PBT, and PAT, with current-quarter, previous-quarter, and same-quarter-prior-year comparisons. Verify values, QoQ/YoY periods, and consistent units and reporting basis. Do not invent an unavailable metric. | M p. 2; R p. 2 |
| I-05 | Business snapshot. | Explain the business, segments, and revenue mix using primary documents. | M p. 3 |
| I-06 | Financial snapshot. | Present selected headline revenue, margins, PAT, and/or key ratios with the relevant reporting period. | M p. 3 |
| I-07 | Trajectory. | Support a multi-year growth or compression trend with comparable source figures. | M p. 3 |
| I-08 | Balance sheet. | Analyze selected debt, leverage, working-capital-cycle, or funding-structure facts. | M p. 3 |
| I-09 | Cash quality. | Compare profit with cash generation or cash conversion using source financial statements. | M p. 3 |
| I-10 | Narrative versus numbers. | Connect a specific management statement with relevant reported financial outcomes, identifying agreement or divergence. | M p. 3 |
| I-11 | Guidance. | Identify explicit management expectations for growth, margins, capex, or other chosen headline measures. Distinguish management guidance from the agent's inference. | M p. 3 |
| I-12 | Bull versus bear. | Give a concise case each way supported by primary evidence, with reasoning distinct from reported facts. | M p. 3 |
| I-13 | Four-quarter promises versus delivery. | For the last four quarters, align management's own headline guidance and growth commentary with what was subsequently delivered. Use period-matched source evidence; identify missing guidance or incomparable outcomes. This is a valued worked example, not mandatory four-quarter coverage for every ticker. | M p. 3 |
| I-14 | Chat, voice, copilot, dashboard, or another interaction model. | The selected interface enables the chosen workflows on a phone. None of these particular interface forms is required. | M p. 3 |
| I-15 | Announcement classification from the reference. | If adopting it, map sample filings consistently to the chosen labels and explain adaptations. Implementing all labels or using the supplied taxonomy verbatim is optional. | M p. 2; R p. 1 |

The reference supplies these **17 optional category labels**: `results`, `M&A`, `fund_raise`, `management_change`, `litigation`, `insider_trading`, `earnings_call`, `investor_meetings`, `credit_rating`, `dividend`, `bonus_split`, `capex`, `press_release`, `postal_ballot`, `agm_egm`, `pledging`, and `unclassified`.

If using that taxonomy, retain its intended distinctions: for example, `results` includes related meeting/publication notices, `earnings_call` includes notices/transcripts/recordings, `insider_trading` covers insiders' personal share transactions, and `unclassified` covers routine low-relevance paperwork. The reference even groups buybacks under `fund_raise`; adapting the labels is expressly permitted. These explanations do not create extra feature requirements.

### Financial meaning when a chosen feature uses these terms

The glossary explains the domain; it does not require a screen for every term. Use R pp. 2-3 as the source of meaning. In particular:

- Revenue is total sales; EBITDA is earnings before interest, tax, depreciation, and amortisation; PBT is profit before tax; PAT is profit after tax/net profit. These are distinct measures.
- A margin is a profit measure divided by revenue, expressed as a percentage. QoQ compares the immediately preceding quarter; YoY compares the same quarter one year earlier.
- Debt-to-equity is total debt divided by shareholders' equity. Free cash flow is cash from operations minus capital spending. Cash conversion asks whether accounting profit becomes real cash; the reference does not mandate one cash-conversion ratio.
- The working-capital cycle concerns cash tied up in inventory and customer receivables, net of supplier payables. A balance sheet is a point-in-time statement; cash flow measures actual cash movements.
- Guidance means management's stated forward expectations. A record date determines corporate-action eligibility; a bonus/split increases share count without a cash payout; a dividend is a cash payout.
- ROCE/ROE, contingent liabilities, related-party transactions, auditor qualifications, promoter pledging, capex, and corporate-action terms are explained in the reference for use where relevant. Their inclusion in the glossary does not require building dedicated analyses.

## 7. Mandatory submission requirements

These are eventual delivery gates. This stage creates only this requirements document; it does not create a repository, publish the prototype, or send an email.

| ID | Required deliverable / instruction | Testable acceptance criteria | Source |
| --- | --- | --- | --- |
| M-12 | Phone-testable prototype. | The covering email provides a working delivery route that an evaluator can use on a phone: a deployed link, Expo/TestFlight, responsive web, or another suitable route. Verify access and repeat the core phone workflows through that route. No particular hosting provider or native app is mandated. | M p. 4 |
| M-13 | GitHub repository. | A GitHub repository link is included and the intended evaluator can access the submitted code. A local folder alone is insufficient. No public-repository requirement is stated. | M p. 4 |
| M-14 | AI build history. | Include exports and/or share links for the coding-agent and LLM conversations used while building. Verify that the supplied history is readable and shows the working process; final code or a retrospective summary alone does not satisfy this deliverable. | M p. 4 |
| M-15 | Short writeup in the covering email. | The email explains all four topics: what was built; key decisions and trade-offs; deliberate omissions; and where the product would go next. The PDFs give no word limit. | M p. 4 |
| M-16 | Submission destination and exact subject. | The eventual response email contains the relevant links/attachments, is addressed to `assessment@enam.com`, and uses the exact subject `ENAM - IIT screening - 2027`. | M p. 4 |
| M-17 | Meet the stated deadline. | Submission is made by Sunday, November 1, 2026. The exact cutoff time and timezone are unspecified; plan to submit early rather than assume an unstated time. | M p. 1 |

## 8. Recommendations, clearly separate from the assignment

| ID | Recommendation | Proposed check / evidence |
| --- | --- | --- |
| REC-01 | Keep the scope narrow while retaining both interaction modes and all sources. A prioritized portfolio-change view plus a compact, sourced research flow is a reasonable candidate. Prefer a few useful conclusions over eight shallow sections. Choose the final scope before implementation. | A scope note names the chosen push and pull workflows, the investor task each serves, and deliberately omitted illustrative features. |
| REC-02 | Verify mobile usability concretely. Test portrait widths of 360, 390, and 430 CSS pixels, plus a real phone. Prefer touch targets of at least 44 by 44 CSS pixels, readable text, and concise expandable detail. These numbers are proposed targets. | Complete open app -> inspect change -> request company research -> inspect evidence using touch. Check that controls and essential content are not clipped, the on-screen keyboard does not block completion, and the page has no unintended horizontal overflow. |
| REC-03 | Make evidence easy to inspect. Attach source links, document titles, reporting periods, and page/section or transcript references to substantive research claims. | Open citations on a phone and independently locate the facts behind sampled claims. Recalculate sampled derived metrics. This also supplies evidence for M-10 without imposing a citation system on the brief. |
| REC-04 | Run cold unfamiliar-ticker tests. Hold back at least two valid NSE companies from the portfolio, demo set, and local company-document cache; choose ones with available annual reports and transcripts. | Research both without code changes, hand-added documents, or prepared answers. Confirm company identity and evidence. This is stronger evidence for M-06 than testing a third pre-seeded list. An evaluator-selected company should use the same path. |
| REC-05 | Show invalid symbols, unavailable reports/transcripts, provider errors, stale data, and partial research explicitly. | Test an invalid ticker, a missing document, and a source failure. Return an actionable state, show what evidence is available, and avoid fabricated figures or fallback to secondary commentary/model memory. Missing-data handling does not excuse failure on a valid NSE ticker whose data is available. |
| REC-06 | Track source coverage and freshness. Keep trading dates, filing timestamps, document periods, and acquisition status; distinguish an empty filing window from a failed fetch. | Review a coverage record for each portfolio company and both document types for research demonstrations. Check weekends/holidays and repeated fetches so dated or duplicated records do not look like new events. The brief specifies no freshness SLA. |
| REC-07 | Respect financial comparability. Normalize units and identify currency, quarter/year, consolidated versus standalone basis, and any restatement. Handle zero/negative comparison bases and unavailable EBITDA explicitly. | Recompute sampled comparisons from the original filings. Do not silently compare different periods, bases, or units, or present an undefined percentage change as a valid result. |
| REC-08 | Use varied sectors and company sizes in the mock portfolio, and include an ad-hoc company outside it. | Record sector/size diversity and demonstrate a research request outside the portfolio. No sector quotas or mandatory disjoint demo set are implied. |
| REC-09 | Spend efficiently. Use caching, chunking, and model routing when useful, and track approximate cost and latency. | Repeating the same request should reuse suitable fetched data/results. Record enough evidence to explain the cost/quality trade-off. Efficiency earns bonus points, but free-tier-only operation, zero cost, a particular model, and a specific routing architecture are not mandatory (M p. 3). |
| REC-10 | Preserve build conversations from the outset and prepare reproducible repository instructions. | Before submission, verify history exports/share links and that repository instructions explain setup, required configuration, running the prototype, and known limitations. These instructions support reviewability; they are not a separately specified ENAM document format. |

## 9. Acceptance review sequence and unresolved choices

Use this sequence when the prototype exists:

1. **Working phone delivery:** Open the intended submission route on a phone and complete both workflows (M-01 to M-03, M-12).
2. **Coverage and data:** Count the portfolio, check the ad-hoc set, and exercise all three acquisition paths against real sources (M-04, M-05, M-07 to M-09).
3. **Unfamiliar company:** Supply an NSE ticker outside the selected sets and verify the same research path works where data is available (M-06; REC-04 strengthens the test).
4. **Research audit:** Trace claims to annual reports/transcripts and inspect retrieval inputs for prohibited evidence (M-10, M-11).
5. **Chosen optional features:** Test only the illustrative features actually selected, using their conditional checks. Do not expand this into a requirement to build the whole menu.
6. **Submission package:** Check phone access, GitHub access, AI history, all covering-note topics, destination, subject, and deadline (M-12 to M-17).

Choices intentionally left open before implementation include the exact interaction model, chosen example features, portfolio and demo companies, stack and models, providers within the stated source constraints, refresh cadence, historical depth, and delivery platform. The exact deadline cutoff is an external ambiguity, not an implementation choice.

The PDFs impose no particular frontend/backend framework, database, vector store, authentication system, brokerage integration, trading execution, paid model, live market streaming, native mobile build, or complete set of research panels. Avoid treating these as hidden requirements. No feature acceptance checks have been executed at this requirements-only stage.

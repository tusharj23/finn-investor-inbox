# Submission review against the ENAM PDFs

Reviewed against the four-page **ENAM AI Engineer Build Challenge** and three-page **Reference: Announcement Categories & Financial Glossary**. Both PDFs and all seven pages were read. This review incorporates the public Netlify check from 1 November 2026.

## Requirement status

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Mobile-first working prototype with push and pull flows | [Public Netlify prototype](https://finn-investor-inbox.netlify.app/) loads the inbox and research UI. The deployed research submit currently returns an origin-check error; a source fix is prepared but not yet deployed. | **Partially working; redeploy and retest required.** |
| 15–20 listed companies across sectors and sizes | The broader local ingestion work records 15 NSE names across 13 sectors, but the deployed snapshot serves only INFY and TCS. | **Not met by the public build.** |
| 3–5 research examples | The deployed sample has INFY and TCS documents; the public selector does not include the other local examples. | **Not met by the public build.** |
| Ticker resolution independent of demo lists | The deployed static resolver only selects bundled INFY/TCS. CERA/HAVELLS were tested in the broader ingestion version, not in this static deployment. | **Not met by the public build.** |
| EOD prices and volume | The deployed bundle shows one INFY EOD observation, dated 30 October 2026. It does not include a usable 20-session series for alerts. | **Partial, dated context only.** |
| NSE/BSE announcements | A small set of dated INFY/TCS announcements is bundled. It is not a live or complete 15-company digest. | **Partial.** |
| Annual reports and earnings-call transcripts | INFY annual report/results/transcript and a TCS transcript are bundled with primary-document citations. Coverage is narrow. | **Partial.** |
| Windowed digest and routine filings | 24-hour default and 7/30-day choices; Review/Watch reasons and routine drawer are present. A 30-day window is needed to see older snapshot entries on the current date. | **Present in the deployed UI; data is stale.** |
| Configurable price/volume alerts | Explicitly unavailable; historical EOD baselines are absent from the Netlify bundle. | **Excluded.** |
| Source-backed research with fact/management distinctions | The deployed research UI is present, but a live browser submission failed with “Please send this request from FINN.” Local fix built and passed forwarded-host/foreign-origin checks; deployment check remains. | **Blocked in current public build.** |
| Quarterly comparison | INFY page 6 comparison: Q2 FY27, Q1 FY27, Q2 FY26; consolidated IFRS; ₹ crore. EBITDA omitted because it is not reported there. | **Present; source-backed sample.** |
| Four-quarter guidance versus delivery | Four matched periods are not available in the source bundle. | **Excluded to avoid invented or mismatched values.** |
| GitHub repository link | Configured origin is [github.com/tusharj23/finn-investor-inbox](https://github.com/tusharj23/finn-investor-inbox). A signed-out browser check returned GitHub 404. | **Public reviewer access not verified.** |
| Actual AI conversation history | [Shared AI conversation](https://chatgpt.com/s/cx_6ae4eecc56508191b50dea8da8fa2707) displays the full conversation when opened signed in. | **Present; signed-out reviewer access still needs confirmation.** |
| Covering email | [`COVERING_EMAIL_DRAFT.md`](COVERING_EMAIL_DRAFT.md) contains the required recipient and subject and is not sent. | **Drafted; do not send until release items are resolved.** |

## Live check and correction

On 1 November 2026 the public Netlify homepage and catalogue rendered, the company research screen showed INFY/TCS and source documents, and the snapshot date was visible. Submitting the default Infosys outlook question returned “Please send this request from FINN.” The guard compared `Origin` directly to the internal request URL and rejected the Netlify proxy origin.

`lib/research.ts` now allows a matching forwarded/request host and checks `x-forwarded-proto` when present. The production build passes. A local production request with Netlify-style forwarded headers returned a cited answer; an `https://evil.example` Origin remained blocked with 403. **This patch is not on the public site until pushed and redeployed.**

## Outstanding before submission

- Push the origin-check fix and verify the deployed research answer and citation page.
- Make the GitHub repository accessible to reviewers; signed-out view currently returns 404.
- Confirm the AI history share opens when signed out.
- Repeat narrow-screen/phone checks, source links, and error handling against the updated public build.
- Attach the README, this review, and [the two-minute walkthrough](DEMO_WALKTHROUGH.md) to the covering email if useful. The draft has not been sent.

Detailed historical acquisition notes remain in [`VERIFICATION.md`](VERIFICATION.md), [`EVALUATION.md`](EVALUATION.md), and [`INGESTION.md`](INGESTION.md). Their earlier local results should not be read as evidence that the Netlify snapshot has the same coverage or capabilities.

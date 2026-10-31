# Submission review against the ENAM PDFs

Reviewed October 31, 2026 against the four-page **ENAM AI Engineer Build Challenge** and the three-page **Reference: Announcement Categories & Financial Glossary**. Both source PDFs and all seven pages were read. The main brief's deliverables are a mobile-first working prototype, GitHub repository, actual AI build history, and a covering email/writeup sent to `assessment@enam.com` with subject `ENAM - IIT screening - 2027`.

## Main brief

| Brief requirement | Evidence in this project | Review status |
| --- | --- | --- |
| Mobile-first prototype with push and pull workflows | [finn-app/README.md](finn-app/README.md), [EVALUATION.md](EVALUATION.md); digest and research flows run in the local Worker | **Implemented and locally checked.** Hands-on browser/phone review was blocked by Work settings in the latest evaluation. |
| Mock portfolio of 15–20 listed companies across sectors/sizes | Collector and portfolio manifest; 15 NSE companies across 13 sectors; qualitative size labels | **Met for scope.** Company list is explicitly a mock portfolio. |
| About 3–5 ad-hoc research companies | INFY, TCS, ITC, APLAPOLLO | **Met:** four examples. ITC transcript coverage is explicitly partial. |
| Research not hard-wired to demo set; works on NSE ticker when source data exists | Independent NSE directory resolver; CERA/HAVELLS cold collection and research; VGUARD discovery | **Partially met:** tested holdouts work after collector/indexing; runtime-discovered documents can require the documented collector import before research. |
| EOD portfolio prices and volume | 315 provenance-linked rows; all 15 portfolio price paths checked; alert baseline uses prior valid sessions | **Met in recorded local acquisition.** EOD data is not live intraday pricing. |
| NSE/BSE announcements for portfolio | Exchange filings collected and refreshed for the 15 holdings | **Met in recorded local run.** Coverage and upstream state are timestamped; source access may vary. |
| Annual reports and earnings-call transcripts | Indexed primary documents support research; ITC has annual report but no transcript found | **Partially met:** pipeline supports both, but document coverage varies by company. |
| Push: windowed digest, prioritization and routine filings accessible | 24h default, 7/30d choices, reasons, routine drawer | **Met and tested.** |
| Push: configurable material/EOD alerts | EOD move and volume settings with documented thresholds, prior-session baseline, stable alert IDs, missing-data state | **Chosen EOD example met locally.** OS notifications and an alert for every announcement type are excluded. |
| Pull: primary-source research, no broker/news/model memory as company evidence | Source extracts from company/exchange documents, page/passage citations, unsupported state | **Met for tested responses.** No LLM provider call; answers are not autonomous financial analysis. |
| Mobile-first experience and product judgment | Responsive layouts, touch-target styles and workflow; automated checks and prior narrow-width observation | **Implementation evidence exists; current physical phone/browser walkthrough not completed.** |
| Working/deployed prototype link | [finn-app/README.md](finn-app/README.md) records only local preview | **Missing:** agreed Sites project lookup returned “Sites project not found”; no public deployment or verified public URL. |
| GitHub repository link | No Git remote configured in workspace | **Missing:** no verified GitHub repository URL. |
| Actual AI build history | [Public Codex conversation share](https://chatgpt.com/s/cx_6ae4eecc56508191b50dea8da8fa2707); service returned `audience: public` | **Prepared, external access not independently confirmed.** Verify in a signed-out browser. `FINN_BUILD_PROMPTS.md` is only a prompt guide. |
| Covering note with choices, trade-offs, exclusions and next steps | [COVERING_EMAIL_DRAFT.md](COVERING_EMAIL_DRAFT.md) | **Drafted, not sent.** It calls out missing repository and public prototype URLs. |

## Companion reference

The selected announcement handling uses the reference's distinction between results/meeting notices and routine unclassified filings; the suite covers a future board-meeting notice separately from its actual results outcome. Finance terms and periods in research remain source-labeled. The quarterly comparison uses one consolidated IFRS basis and ₹ crore throughout. The app does not attempt every category in the reference; its taxonomy is guidance, not a requirement to implement every listed alert.

The single quarterly example does not satisfy every illustrative number in the brief: its source page has Revenue, Operating profit, PBT and net profit after non-controlling interests, but no separately reported EBITDA. It shows three same-basis periods and source-reported QoQ/YoY rates. Four-quarter management-guidance-versus-delivery is excluded because the required four matched guidance/outcome periods are not indexed. These limits are visible in the product and evaluation rather than filled with derived or hindsight values.

## Final delivery checklist

- [x] Product README prepared.
- [x] Two-minute demo script prepared.
- [x] Actual Codex build-history share created; signed-out access check remains.
- [x] Covering email drafted with required recipient and subject; not sent.
- [ ] Public prototype URL. Local-only preview: `http://127.0.0.1:8787`.
- [ ] GitHub repository URL. No remote configured.
- [ ] Complete visual phone walkthrough in a browser-enabled environment.
- [ ] Attach README, demo walkthrough and evaluation if desired before sending.
- [ ] Do not send the covering email until the two required public links are added and checked.

Supporting detailed checks and limitations: [EVALUATION.md](EVALUATION.md), [finn-app/VERIFICATION.md](finn-app/VERIFICATION.md), [finn-app/ingestion/REPORT.md](finn-app/ingestion/REPORT.md).

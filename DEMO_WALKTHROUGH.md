# FINN — two-minute demo walkthrough

**Purpose:** show the investor workflow from a prioritised portfolio change to inspectable primary evidence, then demonstrate a source-backed research answer. Run on a phone-sized viewport with the app and local D1/R2 data already initialized.

## 0:00–0:20 — Start with the inbox

Open FINN. Point out the default **Last 24 hours** window and the counts for Review, Watch and Routine. Say that the app orders filings by likely investor relevance and gives a short reason; routine disclosures remain available in the collapsed drawer.

## 0:20–0:45 — Open a real filing

Open the Infosys results filing. Show the filing date, priority rationale, exchange/source freshness, and the original NSE PDF action. Open the evidence passage or PDF page to demonstrate that the filing can be checked against its source.

## 0:45–1:10 — Show the results comparison

On the INFY results detail, show the comparison for Q2 FY27, Q1 FY27 and Q2 FY26. State the shared consolidated IFRS basis and ₹ crore units. The displayed QoQ/YoY rates are reported in the source; EBITDA is omitted because it is not reported in that table. Open the cited page 6 when asked.

## 1:10–1:35 — Move from announcement to research

Choose **Research this company**. Ask a supported question such as “What revenue growth did management guide for?” Show the concise source extract, the management-statement label, reporting period, physical PDF page, and original document link. Explain that unsupported questions return an evidence gap rather than a guess.

## 1:35–1:50 — Resolve an unfamiliar company

Enter `CERA` in company research and submit a supported question. Show that it is resolved outside the portfolio and demo set and that the answer cites an indexed primary document. For a symbol with discovered but not yet indexed PDFs, the UI explicitly says processing is pending.

## 1:50–2:00 — Close with alert rules and limits

Point to EOD alert settings: 5% absolute close move or 2× the mean of the preceding 20 valid sessions, with missing history shown. Mention that prices are end-of-day and refresh is manual. Be explicit that the link currently runs locally: a public deployment and GitHub URL are still missing.

## If an expected item is absent

Do not substitute a fixture or claim live coverage. Show the empty/error/partial-source status, then use the evidence-backed INFY/CERA path above. Refresh from the app only refreshes prices and exchange filings; document discovery and PDF indexing use the collector described in [`finn-app/INGESTION.md`](finn-app/INGESTION.md).

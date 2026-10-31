# FINN — two-minute demo walkthrough

**Prototype:** https://finn-investor-inbox.netlify.app/
**Snapshot:** collected 30 October 2026. The default 24-hour digest may be empty because the collection is frozen. The public research form currently has an origin-check failure; do not present the research step as working until the prepared fix is pushed and redeployed.

## 0:00–0:20 — Start with the inbox

Open FINN and point out the dated snapshot banner and default **Last 24 hours** filter. Explain that the feed is frozen; use the **Last 30 days** filter to show the included filings. Priorities give a reason to inspect a disclosure, while routine filings remain in their drawer.

## 0:20–0:45 — Open a real filing

Open the Infosys results filing. Show its filing date, priority rationale, and original NSE link. Inspect the source passage or PDF page to connect the digest item to the original exchange disclosure.

## 0:45–1:10 — Show the results comparison

On the INFY results detail, show Q2 FY27, Q1 FY27, and Q2 FY26 on a consolidated IFRS basis in ₹ crore. Growth rates are source-reported. EBITDA is omitted because the source table does not separately report it. Open the cited page 6.

## 1:10–1:40 — Move from announcement to research

After the origin-guard fix is deployed, choose **Research this company** and ask “What is management’s outlook?” Show the extract, management-statement label, period, page number, and original document link. Explain that the answer is restricted to bundled passages and is not generated investment advice.

## 1:40–1:55 — Explain coverage limits

Show the company selector with INFY and TCS. Enter a ticker outside the bundle to demonstrate the explicit “not in snapshot” state. Explain that this static Netlify build does not discover or ingest new tickers.

## 1:55–2:00 — Close with the trade-off

Point to the stale/missing source indicators and unavailable price-alert panel. State that the snapshot is dated 30 October 2026 and that refresh, D1/R2 persistence, and threshold alerts are not part of the hosted build.

## Do not claim

Do not claim the hosted research request works until a post-deploy check succeeds. Do not present the bundled two-company sample as 15–20-company live coverage or unfamiliar-ticker discovery. The repository’s [`INGESTION.md`](INGESTION.md) documents the broader acquisition workflow and its boundaries.

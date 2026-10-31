# Ingestion acquisition report

Verified on 2026-10-30T23:31:26.702268+05:30 (Asia/Kolkata). This report describes actual responses, including failures; it does not certify complete exchange coverage.

## Portfolio and research coverage

The portfolio contains 15 currently listed NSE equities, across 13 selection sectors. Size bands (11 large, 3 mid, 1 small) are qualitative selection labels, not current SEBI/AMFI classifications or measured market-cap rankings. Membership lives in `portfolio.json`; research examples are independently selected in `research-examples.json`.

| Symbol | Official NSE company name | Selection sector | Size label | Filings in acquired 30-day window |
|---|---|---|---|---:|
| INFY | Infosys Limited | Information technology | large | 18 |
| TCS | Tata Consultancy Services Limited | Information technology | large | 19 |
| HDFCBANK | HDFC Bank Limited | Banking | large | 17 |
| RELIANCE | Reliance Industries Limited | Energy, retail and telecom | large | 17 |
| ITC | ITC Limited | Consumer goods and paperboards | large | 2 |
| SUNPHARMA | Sun Pharmaceutical Industries Limited | Pharmaceuticals | large | 17 |
| MARUTI | Maruti Suzuki India Limited | Automobiles | large | 15 |
| LT | Larsen & Toubro Limited | Engineering and construction | large | 13 |
| NTPC | NTPC Limited | Power generation | large | 13 |
| TATASTEEL | Tata Steel Limited | Metals | large | 7 |
| PIDILITIND | Pidilite Industries Limited | Specialty chemicals | large | 10 |
| DIXON | Dixon Technologies (India) Limited | Electronics manufacturing | mid | 11 |
| APLAPOLLO | APL Apollo Tubes Limited | Steel products | mid | 10 |
| KARURVYSYA | Karur Vysya Bank Limited | Banking | mid | 17 |
| ROUTE | ROUTE MOBILE LIMITED | Communications software | small | 14 |

All 15 identities were verified against the [NSE listed-equity directory](https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv). All 15 Yahoo price/volume queries and all 15 NSE announcement queries succeeded. The latest completed EOD observation is 30 October 2026 for every portfolio company. There are 315 daily observations, 200 unique filings, seven downloaded original PDFs and 1,648 indexed pages. Announcement requests include `from_date`/`to_date`; responses are additionally filtered by symbol and publication timestamp. A zero-row result is recorded as an empty success, distinct from a failed request.

Research examples: INFY (results/outlook), TCS (guidance policy), ITC (consumer business and capital allocation), APLAPOLLO (industrial volume/capacity). Four annual reports and three earnings-call transcripts were acquired. ITC had no original transcript link on the retrieved discovery page; its annual report remains usable. This is a real source gap, not a fabricated transcript or successful transcript fetch.

## Original document provenance

| Company | Type | Reporting period verified from PDF | PDF pages | Accessed at (UTC) | Original discovered URL | Final PDF URL |
|---|---|---|---:|---|---|---|
| INFY | annual_report | FY2025-26 (2025-04-01 to 2026-03-31) | 383 | 2026-10-30T13:08:08.395420+00:00 | [Discovered original](https://www.bseindia.com/xml-data/corpfiling/AttachHis/19dd605c-2b6b-4084-8dca-9d578a3eb7a0.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachHis/19dd605c-2b6b-4084-8dca-9d578a3eb7a0.pdf) |
| INFY | earnings_call_transcript | Q2 FY2026-27 (2026-07-01 to 2026-09-30) | 48 | 2026-10-30T13:08:28.702755+00:00 | [Discovered original](https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=7982fc61-7765-4981-ab3d-6aec36ba2137.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachLive/7982fc61-7765-4981-ab3d-6aec36ba2137.pdf) |
| TCS | annual_report | FY2025-26 (2025-04-01 to 2026-03-31) | 361 | 2026-10-30T13:08:06.259031+00:00 | [Discovered original](https://www.bseindia.com/xml-data/corpfiling/AttachHis/ad42e748-d73c-4c79-8c52-bcf1b1399bc1.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachHis/ad42e748-d73c-4c79-8c52-bcf1b1399bc1.pdf) |
| TCS | earnings_call_transcript | Q2 FY2026-27 (2026-07-01 to 2026-09-30) | 29 | 2026-10-30T13:08:30.883053+00:00 | [Discovered original](https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=7dc14216-f892-46f1-bf82-5c7b387a83b9.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachHis/7dc14216-f892-46f1-bf82-5c7b387a83b9.pdf) |
| ITC | annual_report | FY2025-26 (2025-04-01 to 2026-03-31) | 416 | 2026-10-30T13:08:15.521064+00:00 | [Discovered original](https://www.bseindia.com/xml-data/corpfiling/AttachHis/590b42ae-15c9-44cf-be69-e58053128a6b.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachHis/590b42ae-15c9-44cf-be69-e58053128a6b.pdf) |
| APLAPOLLO | annual_report | FY2025-26 (2025-04-01 to 2026-03-31) | 417 | 2026-10-30T17:58:46.439444+00:00 | [Discovered original](https://www.bseindia.com/xml-data/corpfiling/AttachHis/e19a06e2-b29e-41b3-a6c3-09a3fb3dd929.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachHis/e19a06e2-b29e-41b3-a6c3-09a3fb3dd929.pdf) |
| APLAPOLLO | earnings_call_transcript | Q2 FY2026-27 (2026-07-01 to 2026-09-30) | 19 | 2026-10-30T17:58:59.880466+00:00 | [Discovered original](https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=3bca608c-0bbc-48de-98cb-1179ed4a4c88.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachLive/3bca608c-0bbc-48de-98cb-1179ed4a4c88.pdf) |
| CERA | annual_report | FY2025-26 (2025-04-01 to 2026-03-31) | 207 | 2026-10-30T18:00:08.262344+00:00 | [Discovered original](https://www.bseindia.com/xml-data/corpfiling/AttachHis/903e8d5c-0373-4a07-9b1d-13920a29c910.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachHis/903e8d5c-0373-4a07-9b1d-13920a29c910.pdf) |
| CERA | earnings_call_transcript | Q1 FY2026-27 (2026-04-01 to 2026-06-30) | 15 | 2026-10-30T18:01:26.457223+00:00 | [Discovered original](https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=ae61e19c-7b8a-405e-8efe-047b6af99fbe.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachHis/ae61e19c-7b8a-405e-8efe-047b6af99fbe.pdf) |
| HAVELLS | annual_report | FY2025-26 (2025-04-01 to 2026-03-31) | 442 | 2026-10-30T18:00:12.623556+00:00 | [Discovered original](https://www.bseindia.com/xml-data/corpfiling/AttachHis/91649597-75d8-410c-b359-b79e40e6bd6b.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachHis/91649597-75d8-410c-b359-b79e40e6bd6b.pdf) |
| HAVELLS | earnings_call_transcript | Q2 FY2026-27 (2026-07-01 to 2026-09-30) | 17 | 2026-10-30T18:01:25.213625+00:00 | [Discovered original](https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=160d9e40-34d9-4f66-8c1f-e1c50f663569.pdf) | [PDF](https://www.bseindia.com/xml-data/corpfiling/AttachHis/160d9e40-34d9-4f66-8c1f-e1c50f663569.pdf) |

Each batch retains original and resolved source URLs, source access/attempt timestamps, reporting-period verification, SHA-256, byte count, discovery URL and per-page text. Raw responses and original PDFs are retained under `.state/raw/<sha256>.*`; the SQLite cache retains responses and attempts. Local paths in acquisition output are private operational metadata and must be removed before exposing the batch through a public API. Reporting periods are distinct from acquisition freshness. INFY’s combined filing includes a media conference before the investor call; the indexed earnings-call section starts at PDF page 24. No reporting date is inferred merely from a filename.

## Actual failures and practical alternatives

- The initial portfolio probe used TATAMOTORS, which returned Yahoo HTTP 404 and is absent from the current NSE directory. The directory contains TMPV (Tata Motors Passenger Vehicles) instead. The portfolio now uses verified MARUTI for automotive exposure; no silent symbol remapping occurs.
- The first burst of Screener requests produced HTTP 429 for several companies. Identity resolution now uses the official NSE directory and only document discovery uses Screener, with serialized spacing between requests. Resolution does not read either selection list.
- ITC transcript discovery returned no original link. Use the available annual report for supported research; investor presentations may be added as a separately labelled document type, not represented as earnings-call transcripts.
- CERA and HAVELLS BSE `AnnPdfOpen.aspx` viewer URLs returned HTTP 406. The same attachment filenames were successfully fetched from BSE `xml-data/corpfiling/AttachHis/`; original viewer URLs and the failed accesses remain in each document’s `accessFailures` and cache attempts. `AttachLive` is a secondary same-attachment fallback.
- Failed acquisition does not erase a successful cache entry. A forced fetch failure returns retained bytes with `stale:true`, the original success timestamp and explicit refresh error. Runtime imports must likewise retain the last good persisted company data.

## Cold company discovery

CERA and HAVELLS are outside both the portfolio and research-example lists. They were first acquired using a separate empty `ingestion/.state/holdout` directory. Both resolved from the NSE directory and acquired EOD, announcements and annual reports. Their transcript viewer failures were then recovered through the direct-PDF fallback. Final holdout output has two companies, 15 filings, 42 daily observations, four original PDFs and 679 indexed pages; both membership flags remain false. CERA’s newest discovered transcript reports Q1 FY2026-27 (quarter ended 30 June 2026), not the newer Q2 period; that real period is preserved.

## Cache, deduplication and refresh checks

- Cached portfolio repeat (`output/repeat.json`) recorded 52 source cache hits and retained exactly the same 200 filing IDs, seven document IDs and 1,648 page IDs as `output/latest.json`.
- Filings deduplicate by company plus attachment URL, or exchange sequence/publication timestamp when no attachment exists. Documents use company plus PDF content hash; originals are content-addressed and reused. Pages use document ID plus PDF page number. Daily prices use symbol plus session date.
- `--force` was exercised on MARUTI (`output/forced-refresh.json`): fresh network requests for the shared NSE listing, Yahoo prices and NSE announcements succeeded with zero errors; the identity lookup then reused the just-refreshed shared directory. The refreshed price and announcement states have `fromCache:false`.
- Seven Python unit tests passed: independent cold symbol resolution, invalid-symbol rejection, attachment/no-attachment deduplication and date bounds, explicit forced-offline stale retention, cache reuse and checksum verification, verified/unknown fiscal periods, and routine-versus-results classification.

## Repeatable commands

Run from `finn-app` with Python 3 and `pypdf` available:

```sh
python3 ingestion/collector.py
python3 ingestion/collector.py --output ingestion/output/repeat.json
python3 ingestion/collector.py --symbols CERA,HAVELLS --documents --state ingestion/.state/holdout --output ingestion/output/holdout.json
python3 ingestion/collector.py --symbols MARUTI --force --output ingestion/output/forced-refresh.json
python3 -m unittest discover -s ingestion -p 'test_*.py' -v
```

Prices cache for 30 minutes, announcements for 15 minutes, identity/discovery for 24 hours, original PDFs for 30 days. `--force` bypasses acquisition TTLs. Financial reporting periods and latest EOD session dates remain visible even after a fresh download. This CLI prepares import batches; deployment/running-app import and runtime refresh are verified separately by the application owner.

# Covering email draft — do not send yet

**To:** assessment@enam.com
**Subject:** ENAM - IIT screening - 2027

Dear ENAM Assessment Team,

I’m sharing FINN, a mobile-first investor inbox prototype that prioritises exchange disclosures and connects them to source-backed company research.

- **Prototype:** https://finn-investor-inbox.netlify.app/
- **Repository:** https://github.com/tusharj23/finn-investor-inbox
- **AI build history:** https://chatgpt.com/s/cx_6ae4eecc56508191b50dea8da8fa2707

The current Netlify snapshot includes Infosys and TCS documents, an announcement digest, evidence passages with document periods and PDF pages, and an Infosys quarterly comparison. It uses a dated source snapshot rather than live ingestion. The wider local ingestion work and its limits are documented in the repository.

The main trade-off was to keep the hosted prototype small and self-contained: it requires no paid model key or database, but refresh, configurable price alerts, and arbitrary-ticker discovery are not available in this deployed snapshot. The data is dated 30 October 2026. The quarterly comparison uses only the periods and units present in the source filing; the four-quarter guidance-versus-delivery view was excluded because the required matched evidence was not available.

**Current checks:** after the latest push, the hosted research form returned cited INFY and TCS answers, citation inspection opened the supporting passage, and the quarterly comparison loaded. The snapshot is still limited to INFY and TCS and has no live refresh or threshold alerts. The GitHub URL returned 404 when checked signed out, so repository access for reviewers is not confirmed. Physical phone checks remain outstanding.

Before sending, I will make the repository accessible to reviewers, confirm the conversation link works signed out, and complete narrow-screen checks. I will then attach the README, evaluation, and two-minute walkthrough.

Regards,
Tushar Jain

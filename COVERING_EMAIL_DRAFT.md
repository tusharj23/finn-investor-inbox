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

**Release items to complete before sending:** the live research form currently returns an origin-check error. A local fix has been built and verified with Netlify-style forwarded headers, but it still needs to be pushed and redeployed. Also, the GitHub URL returned 404 when checked signed out, so repository access for reviewers is not confirmed. Physical phone checks remain outstanding.

After those items are resolved, I will repeat the hosted research and citation check, confirm signed-out repository and conversation access, and attach the README, evaluation, and two-minute walkthrough.

Regards,
Tushar Jain

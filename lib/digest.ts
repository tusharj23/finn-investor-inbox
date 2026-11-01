import type { Company, Filing, FilingPriority } from "./contracts";

export type DigestGroup = {
  key: string;
  companySymbol: string;
  companyName: string;
  family: string;
  priority: FilingPriority;
  category: string;
  headline: string;
  reason: string;
  publishedAt: string;
  items: Filing[];
};

function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return url.href.replace(/\/$/, "");
  } catch { return raw.trim(); }
}

function duplicateKey(filing: Filing): string {
  const url = canonicalUrl(filing.resolvedUrl || filing.sourceUrl);
  if (url && !/\/api\/corporate-announcements(?:\?|$)/.test(url)) return `${filing.companySymbol}|${url}`;
  return `${filing.companySymbol}|${filing.exchangeSequenceId || filing.id}|${filing.publishedAt}|${filing.title}`;
}

function family(filing: Filing): string {
  const text = `${filing.title} ${filing.summary}`.toLowerCase();
  if (/board meeting (?:intimation|notice)|meeting (?:intimation|notice)|meeting.{0,50}(?:scheduled|shall consider|will consider|to consider)/.test(text)
      && !/outcome of (?:the )?board meeting/.test(text)) return "meeting_notice";
  if (/financial results?|quarterly results?|audited results?|outcome of (?:the )?board meeting.{0,160}(?:results?|financial)/.test(text)) return "results";
  if (/investor presentation|earnings presentation|presentation to investors/.test(text)) return "presentation";
  return `filing:${filing.id}`;
}

function periodMarker(filing: Filing): string | undefined {
  return `${filing.title} ${filing.summary}`.toLowerCase().match(/\bq[1-4]\s*(?:fy)?\s*20?\d{2}[-–/]?\d{0,4}\b|\b(?:fy\s*)?20\d{2}[-–/]\d{2}\b/)?.[0]?.replace(/\s+/g, " ");
}

function related(a: Filing, b: Filing): boolean {
  if (a.companySymbol !== b.companySymbol) return false;
  const gap = Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  if (!Number.isFinite(gap) || gap > 48 * 60 * 60 * 1000) return false;
  const af = family(a), bf = family(b);
  if (af === bf && ["results", "presentation"].includes(af)) {
    const ap = periodMarker(a), bp = periodMarker(b);
    return !ap || !bp || ap === bp;
  }
  return new Set([af, bf]).size === 2 && [af, bf].every(value => ["results", "presentation"].includes(value));
}

function headline(filing: Filing): string {
  const type = family(filing);
  if (type === "meeting_notice") return "Upcoming board meeting";
  if (type === "results") return /outcome of (?:the )?board meeting/i.test(filing.title) ? "Board outcome and financial results" : "Financial results filed";
  if (type === "presentation") return "Investor presentation filed";
  if (/earnings.call|transcript/i.test(filing.title)) return "Earnings-call transcript filed";
  return filing.title.trim().replace(/\s+/g, " ").slice(0, 108) || filing.category;
}

function specificReason(filing: Filing): string {
  const type = family(filing);
  if (type === "meeting_notice") return "Notice of a future board meeting; this filing does not report approved results.";
  if (type === "results") return "Results are reported or approved in this filing; check the period, reporting basis, and units in the source.";
  if (type === "presentation") return "A company presentation is available to compare with its related results disclosure.";
  const meaningful = filing.summary.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).find(sentence => sentence.length > 25 && sentence.length < 190 && !/please find enclosed|kindly take the same on record|this is to inform you/i.test(sentence));
  if (meaningful) return meaningful;
  return filing.reason || "An exchange disclosure is available; inspect its original text to assess relevance.";
}

export function groupAnnouncements(filings: Filing[], companies: Company[]): DigestGroup[] {
  const companyBySymbol = new Map(companies.map(company => [company.symbol, company]));
  const deduplicated = new Map<string, Filing>();
  const quality = (filing: Filing) => (filing.priority === "review" ? 3 : filing.priority === "watch" ? 2 : 1)
    + (filing.summary.length > 40 ? 1 : 0) + (filing.title.length > 12 ? 1 : 0);
  for (const filing of filings) {
    const key = duplicateKey(filing);
    const existing = deduplicated.get(key);
    if (!existing || quality(filing) > quality(existing)) deduplicated.set(key, filing);
  }
  const unique = [...deduplicated.values()]
    .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  const clusters: Filing[][] = [];
  for (const filing of unique) {
    const cluster = clusters.find(items => items.some(item => related(item, filing)));
    if (cluster) cluster.push(filing);
    else clusters.push([filing]);
  }
  return clusters.map(items => {
    const ordered = [...items].sort((a, b) => (a.priority === "review" ? 0 : a.priority === "watch" ? 1 : 2) - (b.priority === "review" ? 0 : b.priority === "watch" ? 1 : 2) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const lead = ordered[0];
    const company = companyBySymbol.get(lead.companySymbol);
    const orderedByDate = [...items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const groupFamily = family(lead);
    const ids = items.map(item => item.id).sort();
    return {
      key: `${lead.companySymbol}:${groupFamily}:${ids[0]}`,
      companySymbol: lead.companySymbol,
      companyName: company?.name || lead.companySymbol,
      family: groupFamily,
      priority: lead.priority,
      category: lead.category,
      headline: headline(lead),
      reason: specificReason(lead),
      publishedAt: orderedByDate[0].publishedAt,
      items: orderedByDate,
    };
  }).sort((a, b) => (a.priority === "review" ? 0 : a.priority === "watch" ? 1 : 2) - (b.priority === "review" ? 0 : b.priority === "watch" ? 1 : 2) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

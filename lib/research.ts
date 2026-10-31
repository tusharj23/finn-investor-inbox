import type { Catalog, Citation, EvidencePage, PrimaryDocument, ResearchResponse } from "./contracts";

export class ResearchError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor(status: number, code: string, message: string, retryable = false) {
    super(message);
    this.name = "ResearchError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

const STOP = new Set("a an and are as at be been by can company companies could did do does explain for from give has have how i in into is it its me of on or our please reported say says should show some stated summarise summarize tell that the their them there these they this to us was we what when where which who why will with would you your management identify identifies about s".split(" "));
const THEMES: Record<string, string[]> = {
  outlook: ["outlook", "guidance", "expect", "expects", "expected", "growth", "forecast", "future", "prospects"],
  risk: ["risk", "risks", "headwinds", "headwind", "uncertainty", "uncertain", "challenge", "challenges", "constraints", "pressure", "competitive", "competition", "softer", "softness"],
  business: ["business", "services", "segments", "products", "customers", "operations", "manufacturing"],
  financial: ["revenue", "profit", "margin", "margins", "earnings", "ebitda", "pat", "debt", "financial", "performance"],
  cash: ["cash", "flow", "conversion", "fcf", "capital", "liquidity"],
};

function tokens(value: string): string[] {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((word) => word.length > 1 && !STOP.has(word));
}

export function normalizeText(value: string): string {
  return value.normalize("NFKC")
    .replace(/([a-z])[-\u00ad]\s*\n\s*([a-z])/g, "$1$2")
    .replace(/External Document\s*©\s*\d{4}\s+[A-Za-z ]{1,60}?\s+Limited\s+\d+\s*/gi, " ")
    .replace(/^\s*Page\s+\d+\s+of\s+\d+\s*/i, "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:www\.\S+|Page\s+\d+\s+of\s+\d+)\s*$/i.test(line))
    .join(" ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateResearchInput(value: unknown, catalog: Catalog): { companySymbol: string; question: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ResearchError(400, "invalid_request", "Choose a company and enter a question.");
  }
  const input = value as Record<string, unknown>;
  if (typeof input.companySymbol !== "string" || typeof input.question !== "string") {
    throw new ResearchError(400, "invalid_request", "Company and question must both be text.");
  }
  const companySymbol = input.companySymbol.trim().toUpperCase();
  const question = input.question.trim();
  if (!/^[A-Z0-9&.\-]{1,24}$/.test(companySymbol)) {
    throw new ResearchError(400, "invalid_company", "Enter a valid NSE symbol or choose a connected company.");
  }
  if (question.length < 2 || question.length > 400) {
    throw new ResearchError(400, "invalid_question", "Keep your company question between 2 and 400 characters.");
  }
  if (!catalog.companies.some((company) => company.symbol === companySymbol)) {
    throw new ResearchError(404, "company_not_connected", "Source documents for this company are not connected yet. Choose one of the connected companies.");
  }
  return { companySymbol, question };
}

function activeThemes(question: string): string[] {
  const q = new Set(tokens(question));
  return Object.entries(THEMES).filter(([, words]) => words.some((word) => q.has(word))).map(([theme]) => theme);
}

function sentences(value: string): string[] {
  return value.split(/(?<=[.!?])\s+(?=[A-Z\d\u201c"'])/).map((sentence) => sentence.trim()).filter(Boolean);
}

function isDisclaimer(value: string): boolean {
  return /forward[- ]looking statement|read in conjunction|safe harbor|safe harbour|may differ materially|corporate participants|table of contents|contents at a glance|this (?:call|conference) is being recorded|listen.only mode|outlined these risks|subscribed to our mailing list/i.test(value);
}

function isQuestionOrBoilerplate(value: string): boolean {
  return /\?|\b(?:my|first|second|next) question\b|one of your (?:large )?peers/i.test(value) || /^(?:thank you|thanks|good (?:morning|afternoon|evening)|ladies and gentlemen|moderator\b)/i.test(value);
}

function scoreSentence(sentence: string, queryTokens: string[], themes: string[], document: PrimaryDocument): number {
  const words = new Set(tokens(sentence));
  let score = queryTokens.reduce((sum, word) => sum + (words.has(word) ? 3 : 0), 0);
  for (const theme of themes) {
    score += THEMES[theme].reduce((sum, word) => sum + (words.has(word) ? 1.7 : 0), 0);
  }
  if (themes.includes("outlook")) {
    if (words.has("guidance")) score += 7;
    if (words.has("outlook")) score += 4;
    if (/\b(?:revising|revised|expect|expects|expected)\b/i.test(sentence)) score += 2;
    if (document.type === "earnings_call_transcript") score += 2;
    if (/\d/.test(sentence)) score += 1;
    if (/(?:do not|don't|does not) provide .*guidance/i.test(sentence)) score += 10;
  }
  if (themes.includes("risk")) {
    if (/\b(?:headwinds?|uncertainty|risks?|competitive intensity|softer.than.expected|pressure)\b/i.test(sentence)) score += 4;
    if (/\b(?:h2|growth|demand|margin|margins|revenue|business|costs?|customers?)\b/i.test(sentence)) score += 1;
    if (document.type === "earnings_call_transcript") score += 4;
    if (/\b(?:constraining|constrained|cautious|impacted|deterioration|spend|spending|inflation|tariffs|discretionary|headwinds?|pressure)\b/i.test(sentence)) score += 5;
    if (/line of defen[cs]e|risk functions|risk management|enterprise risk|governance|identifying, assessing|framework|ERM function/i.test(sentence)) score -= 18;
    if (/major components|as below:|bps from|offset by tailwinds/i.test(sentence)) score -= 14;
  }
  if (isDisclaimer(sentence)) score -= 25;
  if (isQuestionOrBoilerplate(sentence)) score -= 14;
  if (sentence.split(" ").length < 12) score -= 5;
  if (/[•]/.test(sentence)) score -= 8;
  if (/independent directors|board review|fiduciary|performance indicators/i.test(sentence)) score -= 10;
  const numberDensity = (sentence.match(/\d/g)?.length ?? 0) / sentence.length;
  if (numberDensity > 0.12) score -= 10;
  if (sentence.length > 1000) score -= 8;
  return score;
}

function relevantContext(fullText: string, sentence: string): string {
  const index = fullText.indexOf(sentence);
  if (index < 0) return sentence.slice(0, 1200);
  const start = Math.max(0, index - 130);
  const end = Math.min(fullText.length, index + sentence.length + 150);
  return `${start > 0 ? "…" : ""}${fullText.slice(start, end).trim()}${end < fullText.length ? "…" : ""}`.slice(0, 1200);
}

export function researchFromDocuments(catalog: Catalog, pages: EvidencePage[], input: unknown): ResearchResponse {
  const { companySymbol, question } = validateResearchInput(input, catalog);
  const company = catalog.companies.find((item) => item.symbol === companySymbol)!;
  const query = tokens(question).filter((word) => !tokens(company.name + " " + company.symbol).includes(word));
  const themes = activeThemes(question);
  if (query.length === 0 || /\b(?:bitcoin|crypto|cryptocurrency|moon|weather|password|api[ -]?key|system prompt)\b/i.test(question)
      || /\b(?:ignore|disregard)\b.{0,100}\b(?:instructions?|documents?|previous|system)\b/i.test(question)) {
    throw new ResearchError(422, "insufficient_evidence", "That question is outside the connected company evidence. Try asking about management's outlook, risks, or business performance.");
  }
  const documents = company.documents.filter((document) => ["annual_report", "earnings_call_transcript"].includes(document.type));
  if (documents.length === 0) {
    throw new ResearchError(503, "documents_unavailable", "Primary research documents are not ready for this company. Please try again later.", true);
  }
  const documentMap = new Map(documents.map((document) => [document.id, document]));
  if (!pages.some(page => page.companySymbol === companySymbol && documentMap.has(page.documentId))) {
    throw new ResearchError(503, "documents_unindexed", "Primary document links are available, but readable text is not connected yet. Open an original document from the source shelf.", true);
  }
  // Prepared remarks have attributable management statements. Do not turn an
  // analyst's question in a later Q&A section into a company assertion.
  const qaStart = new Map<string, number>();
  const qaMarker = /(?:we will now begin|we (?:will|shall) now (?:start|open)).{0,35}ques\s*tion[\s-]+(?:and[\s-]+)?answer/i;
  for (const page of pages) {
    const doc = documentMap.get(page.documentId);
    if (doc?.type !== "earnings_call_transcript" || page.companySymbol !== companySymbol || page.page < (doc.sectionStartPage ?? 1)) continue;
    if (qaMarker.test(normalizeText(page.text))) qaStart.set(doc.id, Math.min(qaStart.get(doc.id) ?? Infinity, page.page));
  }
  const candidates: { sentence: string; page: EvidencePage; document: PrimaryDocument; text: string; score: number }[] = [];
  for (const page of pages) {
    const document = documentMap.get(page.documentId);
    if (!document || page.companySymbol !== companySymbol || page.page < (document.sectionStartPage ?? 1)) continue;
    if (page.page > (qaStart.get(document.id) ?? Infinity)) continue;
    let text = normalizeText(page.text);
    const marker = text.search(qaMarker);
    if (marker >= 0) text = text.slice(0, marker);
    // Preserve explicit non-guidance statements even when the remainder of
    // that sentence is a standard forward-looking disclaimer.
    const nonGuidance = text.match(/(?:we|the company) (?:do not|don't|does not) provide (?:any )?specific (?:revenue|earnings|financial)[^,.]{0,90}guidance/i)?.[0];
    const passages = sentences(text);
    if (nonGuidance) passages.push(nonGuidance);
    for (const sentence of passages) {
      if (sentence.length < 45 || sentence.length > 1400 || isDisclaimer(sentence)) continue;
      const score = scoreSentence(sentence, query, themes, document);
      if (score >= (themes.length ? 8 : 7)) candidates.push({ sentence, page, document, text, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.page.page - b.page.page);
  const best = candidates[0];
  if (!best) {
    throw new ResearchError(422, "insufficient_evidence", "I couldn't find a sufficiently relevant passage in the connected primary documents. Try a more focused question about outlook, risks, cash flow, or performance.");
  }

  // An explicit topic outside the matching evidence must not be answered with a generic outlook.
  const thematicWords = new Set(Object.values(THEMES).flat());
  const framing = new Set(["latest", "current", "main", "key", "stated", "identify", "identified", "reported", "prospects", "future", "next", "year", "quarter", "financial", "numbers", "constraints"]);
  const specific = query.filter((word) => !thematicWords.has(word) && !framing.has(word));
  const evidenceWords = new Set(tokens(best.sentence));
  if (specific.length > 0 && !specific.some((word) => evidenceWords.has(word))) {
    throw new ResearchError(422, "insufficient_evidence", "The connected documents do not contain a strong enough match for that specific question. Try a broader company question or inspect the original documents.");
  }

  const excerpt = best.sentence.length <= 620 ? best.sentence : best.sentence.slice(0, 617).replace(/\s+\S*$/, "") + "…";
  const citation: Citation = {
    documentId: best.document.id,
    title: best.document.title,
    period: best.document.period,
    page: best.page.page,
    sourceUrl: best.document.sourceUrl,
    ...(best.document.localPdfUrl ? { localPdfUrl: best.document.localPdfUrl } : {}),
    passage: relevantContext(best.text, best.sentence),
  };
  const managementLanguage = best.document.type === "earnings_call_transcript"
    || /\b(?:we|our|management|expects?|outlook|risk|risks|may|will|aims?|anticipat|believe|strategy|plans?)\b/i.test(best.sentence);
  const claimType = managementLanguage ? "management_statement" as const : "reported_fact" as const;
  return {
    companySymbol,
    question,
    answer: `In its ${best.document.period} document, ${company.name} states:\n\n“${excerpt}”`,
    mode: "extractive",
    citations: [citation],
    claimType,
    claimNote: claimType === "reported_fact"
      ? "The company document reports this; FINN has not independently verified it."
      : "This is the company's own statement, not an independently verified fact or a forecast by FINN.",
    calculations: [],
    inferences: [],
    missingEvidence: [],
    limitations: [
      "This response extracts a relevant primary-source passage; it does not add independent verification or a forecast.",
      "Transcript retrieval uses management's prepared remarks; analyst questions and later Q&A are excluded in this version.",
      `Evidence is limited to the connected documents and their stated periods. Sources were accessed on ${best.document.accessedAt.slice(0, 10)}.`,
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function documentEvidence(catalog: Catalog, pages: EvidencePage[], documentId: string | null, pageValue: string | null) {
  if (!documentId || !/^[a-zA-Z0-9\-]{1,80}$/.test(documentId)) {
    throw new ResearchError(400, "invalid_document", "Choose a source document to inspect.");
  }
  const document = catalog.companies.flatMap((company) => company.documents).find((item) => item.id === documentId);
  if (!document) throw new ResearchError(404, "document_not_found", "That document is not connected to this version.");
  const page = pageValue === null ? (document.sectionStartPage ?? 1) : Number(pageValue);
  if (!Number.isInteger(page) || page < 1 || page > document.pdfPages || pageValue === "") {
    throw new ResearchError(400, "invalid_page", "Choose a valid PDF page number.");
  }
  const source = pages.find((item) => item.documentId === documentId && item.page === page);
  if (!source || !normalizeText(source.text)) {
    throw new ResearchError(404, "passage_unavailable", "Text evidence is unavailable for this page. Open the original document to inspect it.");
  }
  return { document, passage: { id: source.id, page: source.page, text: normalizeText(source.text).slice(0, 1200) } };
}

export function jsonResponse(value: unknown, status = 200, cache = "no-store") {
  return Response.json(value, { status, headers: { "Cache-Control": cache, "X-Content-Type-Options": "nosniff" } });
}

export function errorResponse(error: unknown) {
  if (error instanceof ResearchError) {
    return jsonResponse({ error: { code: error.code, message: error.message, retryable: error.retryable } }, error.status);
  }
  // Never forward upstream errors, request bodies, environment values, or stack traces.
  return jsonResponse({ error: { code: "source_unavailable", message: "The source service couldn't complete this request. Please try again.", retryable: true } }, 503);
}

export async function readResearchRequest(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new ResearchError(403, "origin_not_allowed", "Please send this request from FINN.");
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new ResearchError(415, "invalid_content_type", "Send a JSON company question.");
  }
  // Bound actual streamed bytes rather than returning with an unread request
  // body (which can terminate a reused connection in the Worker runtime).
  const reader = request.body?.getReader();
  if (!reader) throw new ResearchError(400, "invalid_json", "Enter a company question and try again.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      throw new ResearchError(413, "request_too_large", "This question is too long. Please shorten it.");
    }
    if (size <= 4096) chunks.push(value);
  }
  if (size > 4096) throw new ResearchError(413, "request_too_large", "This question is too long. Please shorten it.");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ResearchError(400, "invalid_json", "That question could not be read. Please try again.");
  }
}

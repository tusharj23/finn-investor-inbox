export interface PrimaryDocument {
  id: string;
  title: string;
  type: string;
  period: string;
  sourceUrl: string;
  accessedAt: string;
  pdfPages: number;
  localPdfUrl?: string;
  localEvidencePdfUrl?: string;
  localEvidenceLabel?: string;
  sectionStartPage?: number;
  companySymbol?: string;
  originalRequestUrl?: string;
  resolvedUrl?: string;
  sha256?: string;
  bytes?: number;
  reportingPeriod?: string;
  periodStart?: string;
  periodEnd?: string;
  publishedAt?: string;
  fetchedAt?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  historical?: boolean;
  [key: string]: unknown;
}

export type SourceName = "prices" | "announcements" | "documents";
export type FilingPriority = "review" | "watch" | "routine";

export interface SourceState {
  companySymbol: string;
  source: string;
  status: "fresh" | "cached" | "stale" | "error" | "missing" | "success" | "partial";
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  dataAsOf?: string;
  fetchedAt?: string;
  asOf?: string;
  error?: string | null;
  message?: string;
  fromCache?: boolean;
  stale?: boolean;
  [key: string]: unknown;
}

export interface MarketData {
  close: number;
  volume: number;
  date: string;
  changePct?: number;
  companySymbol?: string;
  symbol?: string;
  sourceUrl?: string;
  accessedAt?: string;
  [key: string]: unknown;
}

export interface Company {
  symbol: string;
  name: string;
  sector: string;
  documents: PrimaryDocument[];
  market?: MarketData;
  legalName?: string;
  sizeBand?: string;
  membership?: { portfolio: boolean; researchExample: boolean };
  sourceStates?: Partial<Record<SourceName, SourceState>>;
  coverageNote?: string;
  [key: string]: unknown;
}

export interface Filing {
  id: string;
  companySymbol: string;
  title: string;
  category: string;
  priority: FilingPriority;
  reason: string;
  publishedAt: string;
  summary: string;
  documentId?: string;
  sourceUrl: string;
  originalRequestUrl?: string;
  resolvedUrl?: string;
  fetchedAt?: string;
  accessedAt?: string;
  publishedDateOnly?: boolean;
  historical?: boolean;
  firstSeenAt?: string;
  lastSeenAt?: string;
  [key: string]: unknown;
}

export interface Catalog {
  companies: Company[];
  filings: Filing[];
  snapshotAt: string;
  generatedAt?: string;
  coverage?: {
    mode?: string;
    isLive?: boolean;
    portfolioCount?: number;
    connectedCompanies?: number;
    researchExamples?: string[];
    filingsScope?: string;
    [key: string]: unknown;
  };
  refresh?: { lastRunAt?: string; running?: boolean; [key: string]: unknown };
}

export interface EvidencePage {
  id: string;
  documentId: string;
  companySymbol: string;
  page: number;
  printedPage?: string;
  text: string;
}

export interface IngestionBatch {
  schemaVersion?: number;
  runId?: string;
  startedAt?: string;
  finishedAt?: string;
  companies?: Company[];
  filings?: Filing[];
  documents?: PrimaryDocument[];
  pages?: EvidencePage[];
  market?: MarketData[];
  history?: MarketData[];
  sourceStates?: SourceState[];
  summary?: Record<string, unknown>;
}

export interface Citation {
  documentId: string;
  title: string;
  period: string;
  page: number;
  sourceUrl: string;
  localPdfUrl?: string;
  passage: string;
}

export interface ResearchResponse {
  companySymbol: string;
  question: string;
  answer: string;
  mode: "extractive";
  citations: Citation[];
  claimType: "reported_fact" | "management_statement";
  claimNote: string;
  calculations: string[];
  inferences: string[];
  missingEvidence: string[];
  limitations: string[];
  generatedAt: string;
}

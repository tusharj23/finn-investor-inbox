"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { groupAnnouncements, type DigestGroup } from "../lib/digest";
import type { Company, Filing, PrimaryDocument as Document, SourceState } from "../lib/contracts";

type Catalog = { companies: Company[]; filings: Filing[]; snapshotAt: string; coverage?: { portfolioCount?: number; researchExamples?: string[] }; refresh?: { lastRunAt?: string; running?: boolean } };
type RefreshJob = { status: "running" | "completed" | "partial" | "failed"; completed: number; total: number; symbols: string[]; errors: { symbol: string; source: string; message: string }[]; startedAt: string; finishedAt?: string };
type Citation = { documentId: string; title: string; period: string; page: number; sourceUrl: string; localPdfUrl?: string; passage: string };
type Research = { companySymbol: string; question: string; answer: string; mode: string; citations: Citation[]; claimType: "reported_fact" | "management_statement"; claimNote: string; calculations: string[]; inferences: string[]; missingEvidence: string[]; limitations: string[]; generatedAt: string };
type AlertSettings = { priceEnabled: boolean; priceMovePct: number; volumeEnabled: boolean; volumeMultiple: number };
type PortfolioAlert = { id: string; symbol: string; companyName: string; kind: "price_move" | "volume_spike"; sessionDate: string; observed: number; threshold: number; unit: string; baseline?: number; baselineSessions?: number; sourceUrl?: string; explanation: string };
type AlertCoverage = { symbol: string; latestSession?: string; availableSessions: number; priceStatus: string; volumeStatus: string; message?: string };
type AlertResult = { alerts: PortfolioAlert[]; coverage: AlertCoverage[]; period: string };
type QuarterlyMetric = { id: string; label: string; current: number; previousQuarter: number; yearAgo: number; qoq: string; yoy: string };
type QuarterlyResults = { companySymbol: string; title: string; basis: string; unit: string; periods: { current: string; previousQuarter: string; yearAgo: string }; metrics: QuarterlyMetric[]; omittedMetric: string; source: { documentId: string; title: string; page: number; period: string; sourceUrl: string }; note: string };
type Evidence = { document: Document; passage: { id: string; page: number; text: string } };
type EvidenceTarget = { documentId: string; page: number; citation?: Citation };
type View = "inbox" | "filing" | "research" | "saved";
type SavedSource = { title: string; url: string; documentId?: string; page?: number };
type SavedItem = { id: string; kind: "filing" | "research"; companySymbol: string; companyName: string; title: string; savedAt: string; itemDate: string; summary: string; sources: SavedSource[]; note: string; filings?: Filing[]; research?: Research };
type RequestError = Error & { code?: string; retryable?: boolean };

const questions = ["What is management's outlook?", "What risks does management identify?"];
const defaultAlertSettings: AlertSettings = { priceEnabled: true, priceMovePct: 5, volumeEnabled: true, volumeMultiple: 2 };
const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
function date(value: string, time = false) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "numeric", minute: "2-digit" } : {}), timeZone: "Asia/Kolkata" }).format(d); }
function safeLink(value?: string) { return value && (value.startsWith("https://") || value.startsWith("/documents/") || /^\/api\/documents\/[a-zA-Z0-9_-]+$/.test(value)) ? value : undefined; }
function Arrow({ external = false }: { external?: boolean }) { return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={external ? "M7 17 17 7M7 7h10v10" : "M5 12h14m-6-6 6 6-6 6"}/></svg>; }
function Spinner() { return <span className="spinner" aria-hidden="true"/>; }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, options);
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error("We couldn't read the response. Please try again."); }
  if (!response.ok) {
    const details = body && typeof body === "object" ? (body as { error?: { code?: unknown; message?: unknown; retryable?: unknown } }).error : null;
    const error = new Error(typeof details?.message === "string" ? details.message : "This request couldn't be completed. Please try again.") as RequestError;
    error.code = typeof details?.code === "string" ? details.code : undefined;
    error.retryable = details?.retryable !== false;
    throw error;
  }
  return body as T;
}

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<View>("inbox");
  const [filingId, setFilingId] = useState("");
  const [companySymbol, setCompanySymbol] = useState("INFY");
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const [dataset, setDataset] = useState<"current" | "historical">("current");
  const [now, setNow] = useState(() => Date.now());
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(defaultAlertSettings);
  const [alertDraft, setAlertDraft] = useState<AlertSettings>(defaultAlertSettings);
  const [alertSettingsOpen, setAlertSettingsOpen] = useState(false);
  const [alertResult, setAlertResult] = useState<AlertResult | null>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [readState, setReadState] = useState<Record<string, boolean>>({});
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [resolveNotice, setResolveNotice] = useState("");
  const [refreshJobId, setRefreshJobId] = useState("");
  const [refreshJob, setRefreshJob] = useState<RefreshJob | null>(null);
  const [refreshError, setRefreshError] = useState("");
  const [refreshStarting, setRefreshStarting] = useState(false);
  const [refreshPoll, setRefreshPoll] = useState(0);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [question, setQuestion] = useState(questions[0]);
  const [research, setResearch] = useState<Research | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [researchErrorCode, setResearchErrorCode] = useState("");
  const [evidenceTarget, setEvidenceTarget] = useState<EvidenceTarget | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceReload, setEvidenceReload] = useState(0);
  const [quarterlyResults, setQuarterlyResults] = useState<QuarterlyResults | null>(null);
  const [quarterlyLoading, setQuarterlyLoading] = useState(false);
  const [quarterlyError, setQuarterlyError] = useState("");
  const researchAbort = useRef<AbortController | null>(null);
  const resolveAbort = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const mainScroll = useRef(0);

  useEffect(() => {
    let alertSaved: AlertSettings | undefined;
    try {
      const stored = localStorage.getItem("finn-workflow-v1");
      if (stored) {
        const data = JSON.parse(stored) as { period?: string; readState?: Record<string, boolean>; savedItems?: SavedItem[] };
        if (data.period === "24h" || data.period === "7d" || data.period === "30d") setPeriod(data.period);
        if (data.readState && typeof data.readState === "object") setReadState(data.readState);
        if (Array.isArray(data.savedItems)) setSavedItems(data.savedItems);
      }
      const oldAlertSettings = localStorage.getItem("finn-alert-settings-v1");
      if (oldAlertSettings) {
        const value = JSON.parse(oldAlertSettings) as AlertSettings;
        if (typeof value.priceEnabled === "boolean" && typeof value.volumeEnabled === "boolean" && value.priceMovePct >= .5 && value.priceMovePct <= 25 && value.volumeMultiple >= 1 && value.volumeMultiple <= 10) alertSaved = value;
      }
    } catch { /* keep documented defaults when local browser storage cannot be read */ }
    if (alertSaved) { setAlertSettings(alertSaved); setAlertDraft(alertSaved); }
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    try { localStorage.setItem("finn-workflow-v1", JSON.stringify({ period, readState, savedItems })); } catch { /* show the current session even when storage is unavailable */ }
  }, [preferencesReady, period, readState, savedItems]);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoading(true); setCatalogError("");
    request<Catalog>("/api/catalog", { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      setCatalog(data);
      setCompanySymbol(current => data.companies.some(company => company.symbol === current) ? current : data.companies[0]?.symbol || "");
    }).catch(error => { if (!controller.signal.aborted) setCatalogError(error instanceof Error ? error.message : "The source catalog couldn't be loaded."); }).finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => () => { researchAbort.current?.abort(); resolveAbort.current?.abort(); }, []);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!catalog || !preferencesReady || view !== "inbox" || dataset !== "current") return;
    const controller = new AbortController(); setAlertLoading(true); setAlertError("");
    request<AlertResult>("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: alertSettings, period }), signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setAlertResult(result); })
      .catch(error => { if (!controller.signal.aborted) setAlertError(error instanceof Error ? error.message : "EOD alerts couldn't be calculated. Saved data remains available."); })
      .finally(() => { if (!controller.signal.aborted) setAlertLoading(false); });
    return () => controller.abort();
  }, [catalog, alertSettings, preferencesReady, period, view, dataset]);
  useEffect(() => {
    if (!refreshJobId) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined; let polls = 0;
    async function poll() {
      try {
        const job = await request<RefreshJob>(`/api/refresh?jobId=${encodeURIComponent(refreshJobId)}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setRefreshJob(job); setRefreshError("");
        if (job.status === "running") {
          if (++polls < 150) timer = setTimeout(() => void poll(), 2000);
          else setRefreshError("Refresh is still processing. Recheck its status; saved source data remains available.");
        } else { setReload(value => value + 1); setRefreshJobId(""); }
      } catch (error) { if (!controller.signal.aborted) setRefreshError(error instanceof Error ? error.message : "Refresh status couldn't be checked; saved data is unchanged."); }
    }
    void poll();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [refreshJobId, refreshPoll]);
  useEffect(() => {
    if (!evidenceTarget) { dialog.current?.close(); return; }
    if (!dialog.current?.open) dialog.current?.showModal();
    const controller = new AbortController(); setEvidence(null); setEvidenceLoading(true); setEvidenceError("");
    request<Evidence>(`/api/evidence?documentId=${encodeURIComponent(evidenceTarget.documentId)}&page=${evidenceTarget.page}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setEvidence(evidenceTarget.citation ? { ...data, passage: { ...data.passage, text: evidenceTarget.citation.passage } } : data); })
      .catch(error => { if (!controller.signal.aborted && error.name !== "AbortError") setEvidenceError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setEvidenceLoading(false); });
    return () => controller.abort();
  }, [evidenceTarget, evidenceReload]);
  useEffect(() => {
    if (view !== "filing" || filingId !== "infy-results") { setQuarterlyResults(null); setQuarterlyError(""); setQuarterlyLoading(false); return; }
    const controller = new AbortController(); setQuarterlyResults(null); setQuarterlyError(""); setQuarterlyLoading(true);
    request<QuarterlyResults>("/api/quarterly?documentId=infy-results", { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setQuarterlyResults(value); }).catch(error => { if (!controller.signal.aborted) setQuarterlyError(error instanceof Error ? error.message : "The results comparison isn't available; no figures were shown."); }).finally(() => { if (!controller.signal.aborted) setQuarterlyLoading(false); });
    return () => controller.abort();
  }, [view, filingId]);
  useEffect(() => {
    if (view === "inbox") requestAnimationFrame(() => window.scrollTo(0, mainScroll.current));
    else { window.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); }
  }, [view]);

  const companies = catalog?.companies || [];
  const company = companies.find(item => item.symbol === companySymbol);
  const shelfDocuments = company?.documents.filter(doc => !(doc.indexingStatus === "discovered" && company.documents.some(indexed => indexed.indexingStatus === "indexed" && (indexed.sourceUrl === doc.sourceUrl || indexed.originalRequestUrl === doc.sourceUrl || indexed.sourceUrl === doc.originalRequestUrl || indexed.originalRequestUrl === doc.originalRequestUrl)))) || [];
  const selectedFiling = catalog?.filings.find(item => item.id === filingId);
  const filingCompany = companies.find(item => item.symbol === selectedFiling?.companySymbol);
  const filingDocument = filingCompany?.documents.find(item => item.id === selectedFiling?.documentId);
  const portfolio = companies.filter(item => item.membership?.portfolio ?? true);
  const portfolioSymbols = new Set(portfolio.map(item => item.symbol));
  const cutoff = now - (period === "24h" ? 1 : period === "7d" ? 7 : 30) * 86400000;
  const windowFilings = (catalog?.filings || []).filter(item => portfolioSymbols.has(item.companySymbol)).filter(item => dataset === "historical" ? item.historical === true : !item.historical && Date.parse(item.publishedAt) >= cutoff && Date.parse(item.publishedAt) <= now);
  const categoryOptions = [...new Set(windowFilings.map(item => item.category))].sort();
  const allGroups = groupAnnouncements(windowFilings, companies);
  const visibleGroups = allGroups.filter(group => (companyFilter === "all" || group.companySymbol === companyFilter)
    && (categoryFilter === "all" || group.category === categoryFilter)
    && (!unreadOnly || group.items.some(item => !readState[item.id])));
  const priorityGroups = visibleGroups.filter(group => group.priority !== "routine");
  const routineGroups = visibleGroups.filter(group => group.priority === "routine");
  const historicalCount = (catalog?.filings || []).filter(item => item.historical === true).length;
  const refreshBusy = refreshStarting || Boolean(refreshJobId);
  const examples = companies.filter(item => item.membership?.researchExample || catalog?.coverage?.researchExamples?.includes(item.symbol));
  const portfolioChoices = companies.filter(item => !examples.some(example => example.symbol === item.symbol) && (item.membership?.portfolio ?? true));
  const additionalChoices = companies.filter(item => !examples.some(example => example.symbol === item.symbol) && !portfolioChoices.some(example => example.symbol === item.symbol));
  const currentSavedResearchId = research ? `research:${research.companySymbol}:${research.generatedAt}:${research.question}` : "";
  const unreadCount = windowFilings.filter(item => !readState[item.id]).length;
  const incompleteSources = portfolio.some(item => {
    const status = item.sourceStates?.announcements?.status;
    return status === "error" || status === "missing" || status === "partial" || status === "stale";
  });

  function navigate(next: View) { if (view === "inbox") mainScroll.current = window.scrollY; setView(next); }
  function chooseCompany(symbol: string) { researchAbort.current?.abort(); setCompanySymbol(symbol); setResearch(null); setResearchError(""); setResearchErrorCode(""); setResearchLoading(false); }
  function openResearch(symbol?: string) { if (symbol && symbol !== companySymbol) chooseCompany(symbol); navigate("research"); }
  async function searchCompany(event: FormEvent) {
    event.preventDefault(); resolveAbort.current?.abort();
    const symbol = tickerInput.trim().toUpperCase().replace(/\.NS$/, ""); setResolveError(""); setResolveNotice("");
    if (!/^[A-Z0-9&.\-]{1,24}$/.test(symbol)) { setResolveError("Enter an NSE ticker, such as INFY."); return; }
    const controller = new AbortController(); resolveAbort.current = controller; setResolveLoading(true);
    try {
      const result = await request<{ company: Company }>("/api/companies/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }), signal: controller.signal });
      if (controller.signal.aborted) return;
      setCompanySymbol(result.company.symbol); setResolveNotice(`${result.company.name} verified from the NSE directory.`); setReload(value => value + 1); navigate("research");
    } catch (error) { if (!controller.signal.aborted) setResolveError(error instanceof Error ? error.message : "The NSE company couldn't be verified. Try again."); }
    finally { if (!controller.signal.aborted) setResolveLoading(false); }
  }
  async function startRefresh(symbol?: string) {
    setRefreshStarting(true); setRefreshError(""); setRefreshJob(null);
    try {
      const result = await request<{ jobId: string }>("/api/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(symbol ? { symbol } : {}) });
      if (!result.jobId) throw new Error("Refresh didn't return a job to follow.");
      setRefreshJobId(result.jobId);
    } catch (error) { setRefreshError(error instanceof Error ? error.message : "Refresh couldn't start. Saved data remains available."); }
    finally { setRefreshStarting(false); }
  }
  async function ask(selectedQuestion = question) {
    researchAbort.current?.abort(); const controller = new AbortController(); researchAbort.current = controller;
    setQuestion(selectedQuestion); setResearch(null); setResearchError(""); setResearchErrorCode("");
    if (!selectedQuestion.trim()) { setResearchError("Enter a question about the selected company first."); return; }
    setResearchLoading(true);
    try {
      const result = await request<Research>("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companySymbol, question: selectedQuestion.trim() }), signal: controller.signal });
      if (!controller.signal.aborted) setResearch(result);
    } catch (error) { if (!controller.signal.aborted) { setResearchError(error instanceof Error ? error.message : "Research couldn't be completed."); setResearchErrorCode((error as RequestError)?.code || ""); } }
    finally { if (!controller.signal.aborted) setResearchLoading(false); }
  }
  function setGroupRead(group: DigestGroup, isRead: boolean) { setReadState(previous => ({ ...previous, ...Object.fromEntries(group.items.map(item => [item.id, isRead])) })); }
  function saveGroup(group: DigestGroup) {
    const id = `filing:${group.key}`;
    setSavedItems(previous => previous.some(item => item.id === id) ? previous.filter(item => item.id !== id) : [...previous, {
      id, kind: "filing", companySymbol: group.companySymbol, companyName: group.companyName, title: group.headline,
      savedAt: new Date().toISOString(), itemDate: group.publishedAt, summary: group.reason, note: "", filings: group.items,
      sources: group.items.map(item => ({ title: item.title, url: item.sourceUrl, documentId: item.documentId })),
    }]);
  }
  function saveOneFiling(item: Filing) {
    const id = `filing:${item.id}`; const companyName = companies.find(entry => entry.symbol === item.companySymbol)?.name || item.companySymbol;
    setSavedItems(previous => previous.some(saved => saved.id === id) ? previous.filter(saved => saved.id !== id) : [...previous, {
      id, kind: "filing", companySymbol: item.companySymbol, companyName, title: item.title, savedAt: new Date().toISOString(), itemDate: item.publishedAt,
      summary: item.reason, note: "", filings: [item], sources: [{ title: item.title, url: item.sourceUrl, documentId: item.documentId }],
    }]);
  }
  function saveResearchAnswer() {
    if (!research) return;
    const id = currentSavedResearchId; const companyName = companies.find(entry => entry.symbol === research.companySymbol)?.name || research.companySymbol;
    setSavedItems(previous => previous.some(item => item.id === id) ? previous.filter(item => item.id !== id) : [...previous, {
      id, kind: "research", companySymbol: research.companySymbol, companyName, title: research.question, savedAt: new Date().toISOString(), itemDate: research.generatedAt,
      summary: research.answer, note: "", research, sources: research.citations.map(citation => ({ title: `${citation.title} · PDF page ${citation.page}`, url: citation.sourceUrl, documentId: citation.documentId, page: citation.page })),
    }]);
  }
  function updateNote(id: string, note: string) { setSavedItems(previous => previous.map(item => item.id === id ? { ...item, note } : item)); }
  function openSavedItem(item: SavedItem) {
    if (item.kind === "research" && item.research) { chooseCompany(item.companySymbol); setResearch(item.research); setQuestion(item.research.question); navigate("research"); return; }
    if (item.filings?.[0]) { setFilingId(item.filings[0].id); navigate("filing"); }
  }
  function resetFilters() { setCompanyFilter("all"); setCategoryFilter("all"); setUnreadOnly(false); }
  function saveAlertSettings(event: FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(alertDraft.priceMovePct) || alertDraft.priceMovePct < .5 || alertDraft.priceMovePct > 25 || !Number.isFinite(alertDraft.volumeMultiple) || alertDraft.volumeMultiple < 1 || alertDraft.volumeMultiple > 10) return;
    setAlertSettings(alertDraft); try { localStorage.setItem("finn-alert-settings-v1", JSON.stringify(alertDraft)); } catch { setAlertError("This browser couldn't save the alert preferences; current settings last until you leave FINN."); }
    setAlertSettingsOpen(false);
  }
  function focusEvent(group: DigestGroup) {
    setExpandedGroups(previous => ({ ...previous, [group.key]: true }));
    requestAnimationFrame(() => document.getElementById(`event-${encodeURIComponent(group.key)}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  const sourceState = company?.sourceStates?.documents;
  const answerSaved = Boolean(currentSavedResearchId && savedItems.some(item => item.id === currentSavedResearchId));
  const sourceNeedsAttention = portfolio.reduce((total, item) => total + Object.entries(item.sourceStates || {}).filter(([key, state]) => sourceNeedsReview(item, key, state, now)).length, 0);

  return <div className="terminal-app">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="terminal-header">
      <div className="header-main">
        <button className="brand" onClick={() => navigate("inbox")} aria-label="FINN, go to inbox"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span>FINN</span><small>INVESTOR RESEARCH</small></button>
        <form className="global-search" onSubmit={event => void searchCompany(event)} role="search">
          <label className="sr-only" htmlFor="global-ticker">Search an NSE company</label><span aria-hidden="true">⌕</span><input id="global-ticker" value={tickerInput} onChange={event => setTickerInput(event.target.value)} placeholder="Search a company or NSE ticker" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={24} disabled={resolveLoading}/><button type="submit" disabled={resolveLoading}>{resolveLoading ? <Spinner/> : <>Find <Arrow/></>}</button>
        </form>
        <div className="header-date">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(now)}</div>
      </div>
      <nav className="desktop-nav" aria-label="Main navigation">
        <button className={view === "inbox" || view === "filing" ? "active" : ""} onClick={() => navigate("inbox")}>Inbox <span>{portfolio.length}</span></button>
        <button className={view === "research" ? "active" : ""} onClick={() => navigate("research")}>Research</button>
        <button className={view === "saved" ? "active" : ""} onClick={() => navigate("saved")}>Saved <span>{savedItems.length}</span></button>
        <span className="nav-spacer"/>
        {resolveError && <span className="nav-feedback error" role="alert">{resolveError}</span>}
        {resolveNotice && <span className="nav-feedback" role="status">{resolveNotice}</span>}
      </nav>
      <div className="status-strip">
        <span className="status-dot" aria-hidden="true"/><span><strong>{catalog?.refresh?.running ? "Refresh running" : "Source status"}</strong><small>{catalogLoading ? "Loading saved sources…" : catalogError ? catalogError : `${portfolio.length} companies · ${sourceNeedsAttention} source states need attention`}</small></span>
        <FreshnessPanel companies={companies} now={now}/>
        <button className="refresh-button" onClick={() => void startRefresh()} disabled={refreshBusy}>{refreshBusy ? <><Spinner/> Refreshing</> : "Refresh sources"}</button>
      </div>
      {refreshJob && <div className={`job-strip ${refreshJob.status}`} role="status"><strong>{refreshJob.status === "running" ? "Refresh in progress" : refreshJob.status === "completed" ? "Refresh complete" : refreshJob.status === "partial" ? "Partial refresh" : "Refresh failed"}</strong><span>{refreshJob.completed} of {refreshJob.total} EOD and filing checks completed</span>{refreshJob.errors.map((item, index) => <span className="job-error" key={`${item.symbol}-${item.source}-${index}`}>{item.symbol} · {item.source}: {item.message}</span>)}</div>}
      {refreshError && <div className="job-strip failed" role="alert">{refreshError}<button className="text-button" onClick={() => refreshJobId ? setRefreshPoll(value => value + 1) : void startRefresh()}>Try refresh again</button></div>}
    </header>

    <main id="main" className="terminal-main">
      {view === "inbox" && <>
        <div className="view-heading"><div><p className="eyebrow">PORTFOLIO INTELLIGENCE</p><h1 ref={heading} tabIndex={-1}>Daily briefing</h1></div><div className="heading-meta"><strong>{portfolio.length}</strong><span>portfolio companies<br/><small>{windowFilings.length} filings in selected window</small></span></div></div>
        <div className="terminal-grid">
          <section className="feed-column" aria-label="Portfolio briefing and filings">
            <section className="briefing-panel" aria-labelledby="briefing-heading">
              <div className="briefing-header"><div><p className="eyebrow">THE SIGNAL</p><h2 id="briefing-heading">Worth a closer look</h2></div><label className="period-picker"><span className="sr-only">Filing time window</span><select value={period} onChange={event => setPeriod(event.target.value as typeof period)}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></label></div>
              <div className="dataset-toggle" role="group" aria-label="Filing dataset"><button className={dataset === "current" ? "selected" : ""} onClick={() => setDataset("current")}>Latest collection</button><button className={dataset === "historical" ? "selected" : ""} onClick={() => setDataset("historical")}>Historical examples <span>{historicalCount}</span></button></div>
              {dataset === "historical" && <p className="historical-banner">Historical examples · original filing dates retained</p>}
              {priorityGroups.length ? <div className="briefing-list">{priorityGroups.slice(0, 3).map((group, index) => <button className="briefing-item" key={group.key} onClick={() => focusEvent(group)}><span className="briefing-rank">0{index + 1}</span><span className={`priority-mark ${group.priority}`}/><span className="briefing-copy"><strong>{group.headline}</strong><small>{group.companyName} · {group.category}</small><em>{group.reason}</em></span><span className="briefing-time">{date(group.publishedAt)}</span></button>)}</div>
                : <div className={`briefing-empty ${incompleteSources ? "with-gaps" : "quiet"}`} role="status"><strong>{windowFilings.length ? "No prioritised events match these filters." : "No filings in this period."}</strong><p>{!windowFilings.length && incompleteSources ? "Some exchange sources are stale or incomplete. Expand source status before treating this as a confirmed quiet period." : !windowFilings.length ? "No filings were returned for this window in the latest saved collection." : "Clear one or more filters to see the other prioritised events."}</p></div>}
            </section>

            <section className="event-feed" aria-labelledby="feed-heading">
              <div className="feed-heading"><div><p className="eyebrow">EXCHANGE DISCLOSURES</p><h2 id="feed-heading">Event feed</h2><p>{visibleGroups.reduce((sum, group) => sum + group.items.length, 0)} filings · {visibleGroups.length} grouped events</p></div><button className="quiet-button" onClick={() => navigate("research")}>Go to research <Arrow/></button></div>
              <div className="feed-filters" aria-label="Filter filings">
                <label><span>Company</span><select value={companyFilter} onChange={event => setCompanyFilter(event.target.value)}><option value="all">All companies</option>{[...new Set(windowFilings.map(item => item.companySymbol))].sort().map(symbol => <option key={symbol} value={symbol}>{companies.find(item => item.symbol === symbol)?.name || symbol}</option>)}</select></label>
                <label><span>Category</span><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
                <label className="unread-filter"><input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)}/> Unread only</label>
                <button className="reset-button" onClick={resetFilters} disabled={companyFilter === "all" && categoryFilter === "all" && !unreadOnly}>Reset</button>
              </div>
              <div className="feed-counts"><span><b>{visibleGroups.length}</b> events</span><span><b>{visibleGroups.reduce((sum, group) => sum + group.items.length, 0)}</b> source filings</span><span><b>{visibleGroups.filter(group => group.items.some(item => !readState[item.id])).length}</b> unread</span></div>
              {catalogLoading && <div className="state-block" role="status"><Spinner/>Loading exchange disclosures…</div>}
              {catalogError && <div className="state-block error" role="alert">{catalogError}<button className="quiet-button" onClick={() => setReload(value => value + 1)}>Reload collection</button></div>}
              {!catalogLoading && !catalogError && priorityGroups.map(group => <EventRow key={group.key} group={group} read={group.items.every(item => readState[item.id])} saved={savedItems.some(item => item.id === `filing:${group.key}`)} expanded={!!expandedGroups[group.key]} onExpand={open => setExpandedGroups(previous => ({ ...previous, [group.key]: open }))} onRead={isRead => setGroupRead(group, isRead)} onSave={() => saveGroup(group)} onOpenFiling={id => { setFilingId(id); navigate("filing"); }}/>) }
              {routineGroups.length > 0 && <section className="routine-block"><button className="routine-header" aria-expanded={routineOpen} onClick={() => setRoutineOpen(open => !open)}><span><strong>Routine filings</strong><small>All routine exchange records remain available here</small></span><span className="routine-total">{routineGroups.reduce((sum, group) => sum + group.items.length, 0)}</span><span aria-hidden="true">{routineOpen ? "−" : "+"}</span></button>{routineOpen && routineGroups.map(group => <EventRow key={group.key} group={group} read={group.items.every(item => readState[item.id])} saved={savedItems.some(item => item.id === `filing:${group.key}`)} expanded={!!expandedGroups[group.key]} onExpand={open => setExpandedGroups(previous => ({ ...previous, [group.key]: open }))} onRead={isRead => setGroupRead(group, isRead)} onSave={() => saveGroup(group)} onOpenFiling={id => { setFilingId(id); navigate("filing"); }}/>)}</section>}
              {!catalogLoading && !catalogError && visibleGroups.length === 0 && <div className="state-block">No events match these filters. <button className="quiet-button" onClick={resetFilters}>Reset filters</button></div>}
            </section>
          </section>
          <aside className="context-column" aria-label="Portfolio context">
            <MarketCard company={companies.find(item => item.symbol === "INFY")}/>
            <AlertsPanel result={alertResult} loading={alertLoading} error={alertError} settings={alertSettings} draft={alertDraft} settingsOpen={alertSettingsOpen} setSettingsOpen={setAlertSettingsOpen} setDraft={setAlertDraft} onSave={saveAlertSettings}/>
            <section className="context-card"><p className="eyebrow">RESEARCH DESK</p><h2>Read past the headline.</h2><p>Ask a focused question using annual reports and earnings-call transcripts from company and exchange sources.</p><button className="primary-button" onClick={() => navigate("research")}>Research a company <Arrow/></button><small>Answers stay extractive and cite the source passage.</small></section>
            <p className="terminal-footnote">EOD prices are completed trading sessions, not live quotes. Filing priority is a reading aid and does not predict price movement.</p>
          </aside>
        </div>
      </>}

      {view === "filing" && selectedFiling && <>
        <button className="back-link" onClick={() => navigate("inbox")}>← <span>Back to inbox</span></button>
        <div className="terminal-grid detail-grid"><article className="detail-panel"><div className="detail-top"><span className={`priority-badge ${selectedFiling.priority}`}>{selectedFiling.priority}</span><span className="detail-date">{selectedFiling.historical && <b>Historical example · </b>}Filed {date(selectedFiling.publishedAt, !selectedFiling.publishedDateOnly)}{selectedFiling.publishedDateOnly ? "" : " IST"}</span></div><p className="detail-company">{filingCompany?.name || selectedFiling.companySymbol} <span>{selectedFiling.companySymbol}</span></p><p className="eyebrow">FINN HEADLINE</p><h1 ref={heading} tabIndex={-1}>{digestHeadline(selectedFiling)}</h1><p className="detail-summary">{selectedFiling.summary}</p><section className="why-panel"><h2>Why it is in the feed</h2><p>{selectedFiling.reason}</p></section><div className="detail-actions"><button className="secondary-button" aria-pressed={savedItems.some(item => item.id === `filing:${selectedFiling.id}`)} onClick={() => saveOneFiling(selectedFiling)}>{savedItems.some(item => item.id === `filing:${selectedFiling.id}`) ? "Saved" : "Save filing"}</button><button className="secondary-button" onClick={() => { setReadState(previous => ({ ...previous, [selectedFiling.id]: !previous[selectedFiling.id] })); }}>{readState[selectedFiling.id] ? "Mark unread" : "Mark read"}</button></div><section className="original-filing"><p className="eyebrow">ORIGINAL EXCHANGE TITLE</p><h2>{selectedFiling.title}</h2><p>{selectedFiling.category} · {selectedFilingCompanyPeriod(selectedFiling)}</p><a className="document-link" href={safeLink(selectedFiling.sourceUrl)} target="_blank" rel="noopener noreferrer">Open original filing <Arrow external/></a>{selectedFiling.resolvedUrl && selectedFiling.resolvedUrl !== selectedFiling.sourceUrl && <a className="document-link" href={safeLink(selectedFiling.resolvedUrl)} target="_blank" rel="noopener noreferrer">Open resolved source <Arrow external/></a>}</section>
          {selectedFiling.id === "infy-results" && <QuarterlyComparisonPanel data={quarterlyResults} loading={quarterlyLoading} error={quarterlyError} document={filingDocument} onInspect={page => setEvidenceTarget({ documentId: "infy-results", page })}/ >}
          {filingDocument && <section className="filing-evidence"><div><p className="eyebrow">CONNECTED PRIMARY DOCUMENT</p><h2>{filingDocument.title}</h2><p>{filingDocument.period} · {filingDocument.pdfPages} PDF pages</p></div><button className="secondary-button" onClick={() => setEvidenceTarget({ documentId: filingDocument.id, page: filingDocument.sectionStartPage || 1 })}>Inspect evidence <Arrow/></button></section>}
        </article><aside className="context-column"><MarketCard company={filingCompany}/><section className="context-card"><p className="eyebrow">FROM CHANGE TO CONTEXT</p><h2>What does the company say?</h2><p>Explore its own annual reports and earnings calls.</p><button className="primary-button" onClick={() => openResearch(selectedFiling.companySymbol)}>Research {selectedFiling.companySymbol} <Arrow/></button></section></aside></div>
      </>}

      {view === "research" && <>
        <div className="view-heading compact-heading"><div><p className="eyebrow">PULL RESEARCH</p><h1 ref={heading} tabIndex={-1}>Company research</h1></div><span className="status-chip">Primary documents only</span></div>
        <div className="research-layout">
          <section className="research-main"><div className="question-panel">
            <label className="field-label" htmlFor="company">Choose a company</label>
            <select className="company-select" id="company" value={companySymbol} onChange={event => chooseCompany(event.target.value)}>{examples.length > 0 && <optgroup label="Research examples">{examples.map(item => <option key={item.symbol} value={item.symbol}>{item.name} ({item.symbol})</option>)}</optgroup>}{portfolioChoices.length > 0 && <optgroup label="Portfolio">{portfolioChoices.map(item => <option key={item.symbol} value={item.symbol}>{item.name} ({item.symbol})</option>)}</optgroup>}{additionalChoices.length > 0 && <optgroup label="Other discovered companies">{additionalChoices.map(item => <option key={item.symbol} value={item.symbol}>{item.name} ({item.symbol})</option>)}</optgroup>}</select>
            <p className="company-coverage">{company?.sector} · {shelfDocuments.filter(doc => doc.indexingStatus !== "discovered").length} indexed primary documents</p>
            {company?.coverageNote && <p className="coverage-note">{company.coverageNote}</p>}
            {company && <><CompanySourceStatus company={company} now={now}/><button type="button" className="company-refresh-button" disabled={refreshBusy} onClick={() => void startRefresh(company.symbol)}>{refreshBusy ? "Refreshing sources…" : "Refresh this company’s EOD prices and NSE filings"}</button></>}
            {refreshJob?.symbols?.includes(companySymbol) && <div className="company-refresh-status" role="status"><strong>{refreshJob.status === "running" ? "Company refresh in progress" : refreshJob.status === "completed" ? "Company refresh complete" : refreshJob.status === "partial" ? "Refresh complete with source gaps" : "Refresh failed; saved information is retained"}</strong><p>{refreshJob.completed} of {refreshJob.total} source checks completed.</p>{refreshJob.errors.filter(item => item.symbol === companySymbol).map((item, index) => <p role="alert" key={`${item.source}-${index}`}>{item.source}: {item.message}</p>)}</div>}
            <form onSubmit={event => { event.preventDefault(); void ask(); }}><label className="field-label question-label" htmlFor="question">What would you like to understand?</label><textarea id="question" rows={3} maxLength={400} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about the company’s outlook or risks…"/><div className="question-suggestions" aria-label="Suggested questions">{questions.map(item => <button type="button" key={item} onClick={() => { setQuestion(item); setResearchError(""); }}>{item.replace("What is management's ", "").replace("What risks does management identify?", "Risks & constraints").replace("outlook?", "Management outlook")} <Arrow/></button>)}</div><button className="primary-button ask-button" type="submit" disabled={researchLoading || !companySymbol}>{researchLoading ? <><Spinner/> Reading primary evidence…</> : <>Find an evidence-backed response <Arrow/></>}</button><p className="input-footnote">Newly discovered PDFs must be indexed before FINN can search their text.</p></form>
          </div>
          {researchLoading && <div className="state-block" role="status"><Spinner/>Finding relevant passages in primary documents…</div>}
          {researchError && <div className="inline-error" role="alert"><strong>{researchErrorCode === "documents_unindexed" ? "Primary documents need indexing" : "Research couldn't be completed"}</strong><p>{researchError}</p>{researchErrorCode !== "documents_unindexed" && <button className="text-button" onClick={() => void ask()}>Try again <Arrow/></button>}</div>}
          {research && <ResearchAnswer research={research} saved={answerSaved} onSave={saveResearchAnswer} onInspect={citation => setEvidenceTarget({ documentId: citation.documentId, page: citation.page, citation })}/>}</section>
          <aside className="research-sources"><div className="section-toolbar"><h2>Source shelf</h2><span className="small muted">{company?.symbol}</span></div><p className="shelf-description">Original company documents, reporting periods, and indexing state.</p>{!shelfDocuments.length && <div className="coverage-note">No primary document links are connected yet. Try another NSE ticker or check source status.</div>}{shelfDocuments.map(doc => <article className="source-document" key={doc.id}><button className="source-document-open" onClick={() => setEvidenceTarget({ documentId: doc.id, page: doc.sectionStartPage || 1 })} disabled={!doc.pdfPages}><span className="document-icon" aria-hidden="true">▤</span><span><strong>{doc.title}</strong><small>{doc.period}</small><em className={`index-state ${doc.indexingStatus || (doc.pdfPages ? "indexed" : "discovered")}`}>{doc.indexingStatus === "indexed" || doc.pdfPages ? `${doc.pdfPages} pages · Indexed` : "Discovered · Text not indexed"}</em></span><Arrow/></button><a className="source-original-link" href={safeLink(doc.sourceUrl)} target="_blank" rel="noopener noreferrer">Open original <Arrow external/></a></article>)}<div className="research-boundary"><span className="mini-label">EVIDENCE BEFORE CONFIDENCE</span><p>Answers stay extractive. Open a citation to check the passage, reporting period, and original source.</p></div></aside>
        </div>
      </>}

      {view === "saved" && <>
        <div className="view-heading compact-heading"><div><p className="eyebrow">YOUR READING LIST</p><h1 ref={heading} tabIndex={-1}>Saved</h1></div><span className="status-chip">Stored in this browser · doesn’t sync</span></div>
        <p className="saved-intro">Saved filings and research answers stay on this device. Notes are private to this browser profile and aren’t synced to other devices.</p>
        {savedItems.length === 0 ? <div className="state-block empty-saved"><strong>Nothing saved yet.</strong><p>Save an event from the inbox or a research answer to keep it here.</p><button className="primary-button" onClick={() => navigate("inbox")}>Back to inbox <Arrow/></button></div> : <div className="saved-list">{[...savedItems].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)).map(item => <article className="saved-card" key={item.id}><div className="saved-card-top"><span className="saved-kind">{item.kind === "filing" ? "FILING" : "RESEARCH ANSWER"}</span><time>{date(item.itemDate)}</time></div><p className="saved-company">{item.companyName} <span>{item.companySymbol}</span></p><h2>{item.title}</h2><p className="saved-summary">{item.summary}</p>{item.sources.length > 0 && <div className="saved-sources">{item.sources.map((source, index) => <a key={`${source.url}-${index}`} href={safeLink(source.url)} target="_blank" rel="noopener noreferrer">{source.title} <Arrow external/></a>)}</div>}<label className="note-field"><span>Personal note <small>optional</small></span><textarea rows={2} maxLength={240} value={item.note} onChange={event => updateNote(item.id, event.target.value)} placeholder="Add a reminder or question for later…"/></label><div className="saved-actions"><button className="secondary-button" onClick={() => openSavedItem(item)}>{item.kind === "research" ? "Open answer" : "Open filing"} <Arrow/></button><button className="text-button danger-text" onClick={() => setSavedItems(previous => previous.filter(saved => saved.id !== item.id))}>Unsave</button></div></article>)}</div>}
      </>}
    </main>

    <nav className="mobile-nav" aria-label="Bottom navigation"><button className={view === "inbox" || view === "filing" ? "active" : ""} onClick={() => navigate("inbox")}><span aria-hidden="true">▤</span>Inbox</button><button className={view === "research" ? "active" : ""} onClick={() => navigate("research")}><span aria-hidden="true">⌕</span>Research</button><button className={view === "saved" ? "active" : ""} onClick={() => navigate("saved")}><span aria-hidden="true">☆</span>Saved <small>{savedItems.length}</small></button></nav>

    <dialog ref={dialog} className="evidence-dialog" onCancel={() => setEvidenceTarget(null)} onClose={() => { if (evidenceTarget) setEvidenceTarget(null); }} onClick={event => { if (event.target === event.currentTarget) setEvidenceTarget(null); }} aria-labelledby="evidence-title"><div className="evidence-panel"><div className="dialog-top"><div><p className="eyebrow">PRIMARY-SOURCE EVIDENCE</p><h2 id="evidence-title">{evidence?.document.title || "Inspect the evidence"}</h2></div><button className="close-button" autoFocus aria-label="Close evidence" onClick={() => setEvidenceTarget(null)}>×</button></div>{evidenceLoading && <div className="state-block" role="status"><Spinner/>Opening source passage…</div>}{evidenceError && <div className="inline-error" role="alert"><strong>The passage couldn't be opened.</strong><p>{evidenceError}</p><button className="text-button" onClick={() => setEvidenceReload(value => value + 1)}>Try again</button></div>}{evidence && <><p className="evidence-meta">{evidence.document.period} · PDF page {evidence.passage.page}</p><blockquote className="evidence-passage">{evidence.passage.text}</blockquote><p className="evidence-context">Read alongside the full document for context. This passage is not an independent assessment.</p><div className="evidence-actions"><a className="primary-button" href={safeLink(evidence.document.localPdfUrl) ? `${evidence.document.localPdfUrl}#page=${evidence.passage.page}` : `${safeLink(evidence.document.sourceUrl)}#page=${evidence.passage.page}`} target="_blank" rel="noopener noreferrer">Open original document <Arrow external/></a>{evidence.document.localEvidencePdfUrl && <a className="document-link" href={safeLink(evidence.document.localEvidencePdfUrl)} target="_blank" rel="noopener noreferrer">Saved original-page excerpt <Arrow external/></a>}</div><p className="source-footnote">Accessed {date(evidence.document.accessedAt, true)} IST · Original URL preserved</p></>}</div></dialog>
  </div>;
}

function EventRow({ group, read, saved, expanded, onExpand, onRead, onSave, onOpenFiling }: { group: DigestGroup; read: boolean; saved: boolean; expanded: boolean; onExpand: (open: boolean) => void; onRead: (read: boolean) => void; onSave: () => void; onOpenFiling: (id: string) => void }) {
  return <article id={`event-${encodeURIComponent(group.key)}`} className={`event-row ${read ? "is-read" : "is-unread"} ${group.priority}`}>
    <details open={expanded} onToggle={event => onExpand((event.currentTarget as HTMLDetailsElement).open)}>
      <summary><span className={`priority-mark ${group.priority}`}/><span className="event-main"><span className="event-meta">{group.companyName} <b>{group.companySymbol}</b><i>·</i>{group.category}</span><strong>{group.headline}</strong><span className="event-reason">{group.reason}</span></span><span className="event-time">{date(group.publishedAt, true)}</span><span className="event-expand" aria-hidden="true">{expanded ? "−" : "+"}</span></summary>
      <div className="event-detail"><p className="event-detail-reason">{group.reason}</p>{group.items.map(item => <div className="source-row" key={item.id}><div><strong>{item.title}</strong><small>{item.category} · {date(item.publishedAt, !item.publishedDateOnly)}{item.historical ? " · Historical example" : ""}</small></div><a href={safeLink(item.sourceUrl)} target="_blank" rel="noopener noreferrer">Original <Arrow external/></a><button className="text-button" onClick={() => onOpenFiling(item.id)}>Details</button></div> )}</div>
    </details>
    <div className="event-actions"><button className="text-button" aria-pressed={saved} onClick={onSave}>{saved ? "Saved" : "Save"}</button><button className="text-button" onClick={() => onRead(!read)}>{read ? "Mark unread" : "Mark read"}</button></div>
  </article>;
}

function ResearchAnswer({ research, saved, onSave, onInspect }: { research: Research; saved: boolean; onSave: () => void; onInspect: (citation: Citation) => void }) {
  return <article className="answer-panel" aria-live="polite"><div className="answer-heading"><div><span className="mini-label">{research.companySymbol} · PRIMARY-DOCUMENT EXTRACT</span><h2>{research.question}</h2></div><button className="save-answer-button" aria-pressed={saved} onClick={onSave}>{saved ? "Saved" : "Save answer"}</button></div><section className="answer-section"><p className="answer-section-label">DIRECT ANSWER</p><p className="answer-text">{research.answer}</p></section><section className="claim-classification"><span className={`claim-kind ${research.claimType}`}>{research.claimType === "management_statement" ? "Management statement" : "Reported fact"}</span><p>{research.claimNote}</p><div><strong>Calculations</strong><p>{research.calculations.length ? research.calculations.join("; ") : "None performed. Figures and units remain as printed in the cited period."}</p></div><div><strong>Analysis / inference</strong><p>{research.inferences.length ? research.inferences.join("; ") : "No additional inference added; this answer stays within the cited passage."}</p></div>{research.missingEvidence.length > 0 && <div><strong>Missing evidence</strong>{research.missingEvidence.map(item => <p key={item}>{item}</p>)}</div>}</section><div className="answer-citations"><p className="field-label">SUPPORTING EVIDENCE</p>{research.citations.map((citation, index) => <button className="citation-card" key={`${citation.documentId}-${citation.page}-${index}`} onClick={() => onInspect(citation)}><span className="citation-number">0{index + 1}</span><span><strong>{citation.title}</strong><small>{citation.period} · PDF page {citation.page}</small></span><Arrow/></button>)}</div>{research.limitations?.length > 0 && <div className="limitations"><strong>Uncertainty</strong>{research.limitations.map(item => <p key={item}>{item}</p>)}</div>}<p className="answer-date">Prepared {date(research.generatedAt, true)} IST · Answers are extractive, not generated synthesis.</p></article>;
}

function QuarterlyComparisonPanel({ data, loading, error, document, onInspect }: { data: QuarterlyResults | null; loading: boolean; error: string; document?: Document; onInspect: (page: number) => void }) {
  return <section className="quarterly-results" aria-labelledby="quarterly-results-heading"><div className="quarterly-results-heading"><div><p className="eyebrow">SOURCE-BACKED SNAPSHOT</p><h2 id="quarterly-results-heading">Quarterly results comparison</h2><p>{data?.basis || "Consolidated · IFRS fact-sheet extract"} · {data?.unit || "₹ crore"}</p></div><span className="results-period-badge">INFY · Q2 FY27</span></div>{loading ? <p className="quarterly-state" role="status"><Spinner/>Checking result evidence…</p> : error ? <div className="quarterly-state error" role="alert"><p>{error}</p>{document?.sourceUrl && <a className="document-link" href={safeLink(document.sourceUrl)} target="_blank" rel="noopener noreferrer">Open original results filing <Arrow external/></a>}</div> : data && <><div className="quarterly-metrics">{data.metrics.map(metric => <article className="quarterly-metric" key={metric.id}><h3>{metric.label}</h3><div className="quarterly-values">{([[data.periods.current, metric.current], [data.periods.previousQuarter, metric.previousQuarter], [data.periods.yearAgo, metric.yearAgo]] as const).map(([periodLabel, value]) => <div className="quarterly-value" key={periodLabel}><small>{periodLabel}</small><strong>{formatter.format(value)}</strong></div>)}</div><p className="quarterly-growth">QoQ <strong>{metric.qoq}</strong><span>·</span> YoY <strong>{metric.yoy}</strong><small>Source-reported</small></p></article>)}</div><p className="quarterly-omission">{data.omittedMetric}</p><p className="quarterly-note">{data.note}</p><div className="quarterly-source"><span>{data.source.title} · {data.source.period} · PDF page {data.source.page}</span><button className="text-button" onClick={() => onInspect(data.source.page)}>Inspect source page <Arrow/></button><a className="document-link" href={`${safeLink(document?.localPdfUrl) || safeLink(data.source.sourceUrl)}#page=${data.source.page}`} target="_blank" rel="noopener noreferrer">Open original PDF <Arrow external/></a></div></>}</section>;
}

function digestHeadline(filing: Filing) {
  if (/board meeting (?:intimation|notice)|meeting (?:intimation|notice)/i.test(filing.title)) return "Upcoming board meeting";
  if (/financial results?|quarterly results?/i.test(filing.title)) return "Financial results filed";
  if (/outcome of (?:the )?board meeting/i.test(filing.title) && /results?/i.test(filing.summary)) return "Board outcome and financial results";
  return filing.title;
}
function selectedFilingCompanyPeriod(filing: Filing) { return filing.historical ? "Historical source record" : filing.category; }
function sourceNeedsReview(company: Company, key: string, state: SourceState | undefined, now: number) {
  if (!state || !["error", "missing", "stale", "partial"].includes(state.status)) return false;
  if (key === "prices" && company.market && !state.error && sessionAge(company.market.date, now) <= 4) return false;
  return true;
}
function sessionAge(sessionDate: string, now: number) {
  const today = new Date(now + 19800000).toISOString().slice(0, 10);
  return Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${sessionDate}T00:00:00Z`)) / 86400000);
}
function sourceLabel(state: SourceState | undefined, company: Company, key: string, now: number) {
  if (key === "prices" && company.market && !state?.error && sessionAge(company.market.date, now) <= 4) return "Recent EOD session";
  if (!state || state.status === "missing") return "Not yet fetched";
  if (state.status === "partial") return "Partial coverage";
  if (state.status === "error") return state.lastSuccessAt ? "Update failed · saved data" : "Fetch failed";
  if (state.status === "stale") return "Stale saved data";
  if (state.status === "cached") return "Cached";
  return "Fetched";
}
function CompanySourceStatus({ company, now }: { company: Company; now: number }) {
  const sources = { prices: "EOD price & volume", announcements: "Exchange filings", documents: "Primary documents" };
  const attention = Object.entries(company.sourceStates || {}).filter(([key, state]) => sourceNeedsReview(company, key, state, now)).length;
  return <details className="company-source-status"><summary>Source coverage <span>{attention ? `${attention} need attention` : "and dates"}</span></summary>{Object.entries(sources).map(([key, label]) => { const state = company.sourceStates?.[key as keyof typeof company.sourceStates]; return <div className="source-state-row" key={key}><div className="source-state-title"><strong>{label}</strong><span className={`source-status ${sourceNeedsReview(company, key, state, now) ? "needs-attention" : "ok"}`}>{sourceLabel(state, company, key, now)}</span></div>{key === "prices" && company.market && <p>Latest completed session: <strong>{date(company.market.date)}</strong></p>}{state?.asOf && <p>{key === "announcements" ? "Latest returned filing" : "Source period"}: <strong>{date(state.asOf, key === "announcements")}</strong></p>}{state?.fetchedAt && <p>Fetched {date(state.fetchedAt, true)} IST</p>}{state?.message && <p className="source-state-message">{state.message}</p>}{state?.error && <p className="source-state-message error-text">{state.error}</p>}</div>; })}</details>;
}
function FreshnessPanel({ companies, now }: { companies: Company[]; now: number }) {
  const portfolio = companies.filter(company => company.membership?.portfolio ?? true);
  const sourceIssues = portfolio.reduce((total, company) => total + Object.entries(company.sourceStates || {}).filter(([key, state]) => sourceNeedsReview(company, key, state, now)).length, 0);
  const prices = portfolio.filter(company => company.market).length;
  return <details className="freshness-panel"><summary><strong>Coverage</strong><small>{prices}/{portfolio.length} EOD sessions · {sourceIssues} source issues</small></summary><p className="freshness-intro">EOD coverage follows completed trading sessions. A weekend gap alone is not treated as a failed fetch. The latest session date and any failed source remain visible by company.</p><div className="coverage-companies">{portfolio.map(company => <article className="coverage-company" key={company.symbol}><div className="coverage-company-heading"><span><strong>{company.name}</strong><small>{company.symbol} · {company.sector}</small></span>{company.market && <span className="coverage-price">₹{formatter.format(company.market.close)}<small>Close {date(company.market.date)}</small></span>}</div><CompanySourceStatus company={company} now={now}/></article>)}</div></details>;
}
function MarketCard({ company }: { company?: Company }) {
  if (!company?.market) return <section className="market-card empty-market"><p className="eyebrow">EOD CONTEXT</p><strong>No completed session available.</strong></section>;
  const m = company.market;
  return <section className="market-card" aria-label={`${company.name} end-of-day context`}><div className="market-top"><span className="eyebrow">MARKET CONTEXT · EOD</span><span className="eod-badge">NSE</span></div><p className="market-company">{company.name} <span>{company.symbol}</span></p><div className="market-price">₹{formatter.format(m.close)}{typeof m.changePct === "number" && <span className={m.changePct >= 0 ? "positive" : "negative"}>{m.changePct >= 0 ? "+" : ""}{m.changePct.toFixed(2)}%</span>}</div><div className="market-stat"><span>Traded volume</span><strong>{formatter.format(m.volume)}</strong></div><p className="market-date">Completed session {date(m.date)} · Yahoo Finance</p><p className="market-disclaimer">Daily close and traded volume; not a live quote. No cause is inferred from a filing.</p></section>;
}
function AlertsPanel({ result, loading, error, settings, draft, settingsOpen, setSettingsOpen, setDraft, onSave }: { result: AlertResult | null; loading: boolean; error: string; settings: AlertSettings; draft: AlertSettings; settingsOpen: boolean; setSettingsOpen: (open: boolean) => void; setDraft: (draft: AlertSettings) => void; onSave: (event: FormEvent) => void }) {
  return <section className="alert-panel"><div className="alert-header"><div><p className="eyebrow">DOCUMENTED THRESHOLDS</p><h2>Price & volume alerts</h2></div><button className="quiet-button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>{settingsOpen ? "Close rules" : "Configure"}</button></div><p className="alert-method">±{settings.priceMovePct}% close move or {settings.volumeMultiple}× the previous 20-session mean. Completed sessions only; the current session is excluded from the volume baseline.</p>{settingsOpen && <form className="alert-settings" onSubmit={onSave}><label className="alert-rule"><input type="checkbox" checked={draft.priceEnabled} onChange={event => setDraft({ ...draft, priceEnabled: event.target.checked })}/> Price move</label><label className="alert-threshold">Threshold (%)<input type="number" min="0.5" max="25" step="0.5" value={draft.priceMovePct} onChange={event => setDraft({ ...draft, priceMovePct: Number(event.target.value) })}/></label><label className="alert-rule"><input type="checkbox" checked={draft.volumeEnabled} onChange={event => setDraft({ ...draft, volumeEnabled: event.target.checked })}/> Volume spike</label><label className="alert-threshold">Baseline multiple (×)<input type="number" min="1" max="10" step="0.25" value={draft.volumeMultiple} onChange={event => setDraft({ ...draft, volumeMultiple: Number(event.target.value) })}/></label><button className="primary-button" type="submit">Save alert rules</button></form>}{loading && <p className="alert-state" role="status"><Spinner/>Calculating from available EOD history…</p>}{error && <p className="alert-state error-text" role="alert">{error}</p>}{!loading && !error && result && <>{result.alerts.length ? <div className="alert-list">{result.alerts.slice(0, 4).map(item => <article className="threshold-alert" key={item.id}><p className="alert-title"><strong>{item.companyName}</strong><span>{date(item.sessionDate)}</span></p><p>{item.kind === "price_move" ? `Close ${item.observed > 0 ? "up" : "down"} ${Math.abs(item.observed).toFixed(2)}%` : `Volume ${item.observed.toFixed(2)}× baseline`}</p><small>{item.explanation}</small>{item.sourceUrl && <a className="document-link" href={safeLink(item.sourceUrl)} target="_blank" rel="noopener noreferrer">EOD source <Arrow external/></a>}</article>)}</div> : <p className="alert-state">No configured threshold was crossed in this period.</p>}<details className="alert-coverage"><summary>Coverage and baselines ({result.coverage.length} companies)</summary><ul>{result.coverage.map(item => <li key={item.symbol}><strong>{item.symbol}</strong> · {item.latestSession ? `last session ${date(item.latestSession)}` : "no EOD data"} · {item.message || `${item.availableSessions} sessions available`}</li>)}</ul></details></>}</section>;
}

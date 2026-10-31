import { applyBatch, getCatalog } from './store';
import type { Company, Filing, IngestionBatch, SourceState } from './contracts';
import { classifyDisclosure } from './prioritization';

const headers = { 'User-Agent': 'Mozilla/5.0 FINN/1.0', Accept: 'application/json,text/html,text/csv,*/*' };
const stamp = () => new Date().toISOString();
export function normalizeSymbol(value: unknown): string {
  const symbol = String(value ?? '').trim().toUpperCase().replace(/\.NS$/, '');
  if (!/^[A-Z0-9&-]{1,24}$/.test(symbol)) throw new Error('Enter a valid NSE symbol.');
  return symbol;
}
export async function hash(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
type Acquisition = { text: string; originalUrl: string; resolvedUrl: string; accessedAt: string; lastAttemptAt: string; sha256: string; fromCache: boolean };
export async function acquire(db: D1Database, url: string, ttl: number, force = false): Promise<Acquisition> {
  const row = await db.prepare('SELECT data_json FROM http_cache WHERE key=?').bind(url).first<{data_json:string}>();
  const old = row ? JSON.parse(row.data_json) as Acquisition : undefined;
  if (!force && old && Date.now() - Date.parse(old.accessedAt) < ttl) return { ...old, lastAttemptAt: stamp(), fromCache: true };
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
  const reader = response.body!.getReader(); const parts: Uint8Array[] = []; let length = 0;
  while (true) { const {done,value} = await reader.read(); if (done) break; length += value.byteLength; if (length > 4 * 1024 * 1024) { await reader.cancel(); throw new Error('Source response exceeds the 4 MB discovery limit.'); } parts.push(value); }
  const bytes = new Uint8Array(length); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  const text = new TextDecoder().decode(bytes);
  const result = { text, originalUrl:url, resolvedUrl:response.url, accessedAt:stamp(),lastAttemptAt:stamp(),sha256:await hash(text),fromCache:false };
  await db.prepare('INSERT INTO http_cache(key,data_json) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET data_json=excluded.data_json').bind(url,JSON.stringify(result)).run();
  return result;
}
function provenance(a: Acquisition) { const {text: _, ...rest} = a; return rest; }
function state(symbol:string, source:string, a:Acquisition, asOf?:string):SourceState { return {companySymbol:symbol,source,status:a.fromCache?'cached':'success',lastAttemptAt:a.lastAttemptAt,lastSuccessAt:a.accessedAt,dataAsOf:asOf,fromCache:a.fromCache,stale:false,provenance:provenance(a)}; }
export async function priceBatch(db:D1Database, symbol:string, force=false):Promise<IngestionBatch> {
  const a = await acquire(db,`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?range=1mo&interval=1d`,1800000,force);
  const result = JSON.parse(a.text).chart?.result?.[0];
  if (!result || result.meta?.symbol?.toUpperCase() !== `${symbol}.NS`) throw new Error('Price source did not verify the requested ticker.');
  const q = result.indicators.quote[0]; const access = Date.parse(a.accessedAt); const today = new Date(access + 19800000).toISOString().slice(0,10);
  const values = (result.timestamp as number[]).flatMap((t,i)=> {
    const date = new Date(t*1000+19800000).toISOString().slice(0,10);
    if (date>today || (date===today && access < (result.meta.currentTradingPeriod?.regular?.end ?? Infinity)*1000) || !Number.isFinite(q.close[i]) || !Number.isFinite(q.volume[i])) return [];
    return [{companySymbol:symbol,close:q.close[i],volume:q.volume[i],date}];
  }).sort((x,y)=>x.date.localeCompare(y.date));
  const last = values.at(-1), before = values.at(-2); if (!last) throw new Error('No completed session with price and volume was returned.');
  const history=values.map(row=>({...row,sourceUrl:a.originalUrl,accessedAt:a.accessedAt,provenance:provenance(a)}));
  return {market:[{...last,changePct:before?.close?100*(last.close/before.close-1):undefined,sourceUrl:a.originalUrl,accessedAt:a.accessedAt,provenance:provenance(a)}],history,sourceStates:[state(symbol,'prices',a,last.date)]};
}
export function exchangeDate(value:string):string|undefined {
  const m = value.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})(?: (\d{2}:\d{2}:\d{2}))?$/);
  const month = m ? ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase())+1 : 0;
  const raw = m && month ? `${m[3]}-${String(month).padStart(2,'0')}-${m[1]}T${m[4]||'00:00:00'}+05:30` : /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value)?value.replace(' ','T')+'+05:30':undefined;
  return raw && Number.isFinite(Date.parse(raw)) ? raw : undefined;
}
export async function announcementBatch(db:D1Database,symbol:string,force=false):Promise<IngestionBatch> {
  const date = (n:number) => {const d=new Date(n+19800000).toISOString().slice(0,10).split('-');return `${d[2]}-${d[1]}-${d[0]}`;};
  const cutoff=Date.now()-30*86400000;
  const url=`https://www.nseindia.com/api/corporate-announcements?index=equities&symbol=${encodeURIComponent(symbol)}&from_date=${date(cutoff)}&to_date=${date(Date.now())}`;
  const a=await acquire(db,url,900000,force); const raw=JSON.parse(a.text); if(!Array.isArray(raw))throw new Error('Exchange returned an unexpected response.');
  const filings:Filing[]=[];
  for(const row of raw) {
    const publishedAt=exchangeDate(row.an_dt||row.sort_date||'');
    if(row.symbol!==symbol || !publishedAt || Date.parse(publishedAt)<cutoff || Date.parse(publishedAt)>Date.now()+300000)continue;
    const sourceUrl=String(row.attchmntFile||'').startsWith('https://')?row.attchmntFile:url;
    const title=String(row.desc||'Exchange disclosure'); const summary=String(row.attchmntText||title); const classification=classifyDisclosure(title,summary);
    filings.push({id:'nse-'+(await hash(`${symbol}|${sourceUrl===url?`${row.seq_id}|${publishedAt}`:sourceUrl}`)).slice(0,24),companySymbol:symbol,title,summary,...classification,publishedAt,sourceUrl,originalRequestUrl:sourceUrl,discoveryUrl:url,historical:false,accessedAt:a.accessedAt,provenance:provenance(a)});
  }
  return {filings,sourceStates:[{...state(symbol,'announcements',a,filings.map(f=>f.publishedAt).sort().at(-1)),message:`Exchange checked for ${date(cutoff)} to ${date(Date.now())}; ${filings.length} matching records returned. This is source coverage, not a completeness guarantee.`}]};
}
export async function resolveListedCompany(db:D1Database, value:unknown):Promise<Company> {
  const symbol=normalizeSymbol(value);
  // The exchange's entire listing directory is independent of both product lists.
  const a=await acquire(db,'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv',86400000);
  const rows=a.text.replace(/^\uFEFF/,'').split(/\r?\n/);
  const row=rows.slice(1).map(line=>line.match(/(?:"(?:[^"]|"")*"|[^,]*)(?:,|$)/g)?.map(v=>v.replace(/,$/,'').replace(/^"|"$/g,'').replace(/""/g,'"').trim())).find(c=>c?.[0]===symbol);
  if(!row)throw new Error('This symbol is absent from the fetched NSE equity directory. Check corporate-action symbol changes or retry later.');
  const existing=(await getCatalog(db)).companies.find(c=>c.symbol===symbol);
  const company:Company={...existing,symbol,name:row[1],sector:existing?.sector||'Not classified',documents:[],membership:existing?.membership||{portfolio:false,researchExample:false},identity:{nseSymbol:symbol,exchangeLinkVerified:true,isin:row[6],source:'NSE equity directory',provenance:provenance(a)},coverageNote:'Identity verified against the NSE directory. Document discovery does not imply text indexing; the ingestion command indexes original PDFs.'};
  const docs=[]; const attempted=stamp(); let discoveryState:SourceState;
  try {
    let page:Acquisition; try {page=await acquire(db,`https://www.screener.in/company/${encodeURIComponent(symbol)}/consolidated/`,86400000);}catch{page=await acquire(db,`https://www.screener.in/company/${encodeURIComponent(symbol)}/`,86400000);}
    if(!page.text.includes(`symbol=${encodeURIComponent(symbol)}`)&&!page.text.includes(`symbol=${symbol}`))throw new Error('Discovery page did not confirm the requested NSE identity.');
    const anchors=[...page.text.matchAll(/<a\b([^>]*href=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi)];
    for(const [type,test] of [['annual_report',/Annual Report/i],['earnings_call_transcript',/Raw Transcript/i]] as const){
      const link=anchors.find(m=>test.test(m[1]+' '+m[3])); if(!link)continue;
      const url=new URL(link[2].replace(/&amp;/g,'&'),page.resolvedUrl).href; if(!url.startsWith('https://'))continue;
      // Don't downgrade already indexed originals when rediscovering a link.
      if(existing?.documents.some(d=>d.sourceUrl===url||d.originalRequestUrl===url))continue;
      docs.push({id:`${symbol.toLowerCase()}-discovered-${(await hash(url)).slice(0,16)}`,companySymbol:symbol,title:`${symbol} ${type==='annual_report'?'annual report':'earnings-call transcript'} (discovered)`,type,period:'Period awaiting verification in the original document',sourceUrl:url,originalRequestUrl:url,accessedAt:page.accessedAt,pdfPages:0,discoveryUrl:page.resolvedUrl,indexingStatus:'discovered',provenance:provenance(page)});
    }
    discoveryState={...state(symbol,'documents',page),message:'Primary links checked. Newly discovered PDFs require the ingestion command to index their text.'};
  }catch(error){discoveryState={companySymbol:symbol,source:'documents',status:'error',lastAttemptAt:attempted,error:error instanceof Error?error.message:'Document discovery failed.'};}
  await applyBatch(db,{companies:[company],documents:docs,sourceStates:[state(symbol,'identity',a,a.accessedAt),discoveryState]});
  return (await getCatalog(db)).companies.find(c=>c.symbol===symbol)!;
}

export type RefreshJob={id:string;status:'running'|'completed'|'partial'|'failed';startedAt:string;finishedAt?:string;completed:number;total:number;symbols:string[];errors:{symbol:string;source:string;message:string}[];leaseUntil?:number};
export async function getJob(db:D1Database,id:string):Promise<RefreshJob|undefined>{const row=await db.prepare('SELECT data_json FROM jobs WHERE id=?').bind(id).first<{data_json:string}>();return row?JSON.parse(row.data_json):undefined;}
export async function startJob(db:D1Database,symbol?:string){
  const active=await db.prepare("SELECT data_json FROM jobs WHERE status='running' ORDER BY json_extract(data_json,'$.startedAt') DESC LIMIT 1").first<{data_json:string}>();
  if(active)return JSON.parse(active.data_json) as RefreshJob;
  const catalog=await getCatalog(db);
  if(symbol&&!catalog.companies.some(c=>c.symbol===normalizeSymbol(symbol)))throw new Error('Resolve this company before refreshing its sources.');
  const symbols=symbol?[normalizeSymbol(symbol)]:catalog.companies.filter(c=>c.membership?.portfolio).map(c=>c.symbol);
  if(!symbols.length)throw new Error('No portfolio companies have been imported yet.');
  const job:RefreshJob={id:crypto.randomUUID(),status:'running',startedAt:stamp(),completed:0,total:symbols.length*2,symbols,errors:[]};
  await db.prepare('INSERT INTO jobs(id,status,data_json) VALUES(?,?,?)').bind(job.id,job.status,JSON.stringify(job)).run();return job;
}
/** One bounded step per poll; interrupted sessions can resume the stored job. */
export async function advanceJob(db:D1Database,id:string){
  const job=await getJob(db,id);if(!job||job.status!=='running'||(job.leaseUntil||0)>Date.now())return job;
  const leased=await db.prepare("UPDATE jobs SET data_json=json_set(data_json,'$.leaseUntil',?) WHERE id=? AND status='running' AND COALESCE(json_extract(data_json,'$.leaseUntil'),0) < ?").bind(Date.now()+25000,id,Date.now()).run();
  if(!leased.meta.changes)return getJob(db,id);
  const symbol=job.symbols[Math.floor(job.completed/2)];
  for(const [source,fetcher] of [['prices',priceBatch],['announcements',announcementBatch]] as const){
    const attempted=stamp();
    try{await applyBatch(db,await fetcher(db,symbol,true));}catch(error){const message=error instanceof Error?error.message:'Source request failed.';job.errors.push({symbol,source,message});await applyBatch(db,{sourceStates:[{companySymbol:symbol,source,status:'error',lastAttemptAt:attempted,error:message}]});}
    job.completed++;
  }
  job.leaseUntil=0;
  if(job.completed>=job.total){job.status=job.errors.length===job.total?'failed':job.errors.length?'partial':'completed';job.finishedAt=stamp();}
  await db.prepare('UPDATE jobs SET status=?,data_json=? WHERE id=?').bind(job.status,JSON.stringify(job),id).run();return job;
}

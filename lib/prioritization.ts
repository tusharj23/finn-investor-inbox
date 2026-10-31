import type { Filing } from './contracts';

export function classifyDisclosure(description:string, detail:string) {
  const title=description.trim();
  const text=(title+' '+detail).toLowerCase();
  const outcome=/outcome of (?:the )?board meeting/.test(text);
  const routine=/newspaper|certificate|compliance|trading window|loss of share|dematerial|duplicate share|esop|allotment of securities/.test(text);
  if(routine)return {priority:'routine' as const,category:'Routine disclosure',reason:'Compliance or publication follow-through; the original exchange disclosure remains accessible.'};
  const meeting=/board meeting (?:intimation|notice)|meeting (?:intimation|notice)|meeting.*(?:scheduled|shall consider|will consider|to consider)|(?:scheduled|shall consider|will consider).*meeting/.test(text);
  if(meeting&&!outcome)return {priority:'watch' as const,category:'Meeting notice',reason:'A forthcoming meeting may lead to new disclosure. This notice does not report approved results.'};
  const actualResults=/\bfinancial results?\b|\bquarterly results?\b|\baudited results?\b|\bunaudited results?\b/i.test(title)
    || (outcome&&/\b(?:approved|submitted|declared|considered)\b[\s\S]{0,100}\b(?:financial|quarterly) results?\b/i.test(detail));
  if(actualResults)return {priority:'review' as const,category:'Results released',reason:'The disclosure reports results that were approved or submitted. Inspect the original period, units and reporting basis.'};
  if(/transcript|earnings call/.test(text))return {priority:'watch' as const,category:'Earnings call',reason:'Management discussion is available; compare its statements with the reported period.'};
  if(/acquisition|merger|demerger|resignation|appointment of|litigation|penalty|default|fund rais|buyback/.test(text))return {priority:'review' as const,category:title||'Material update',reason:'A corporate, leadership, financing or regulatory change deserves inspection of the original disclosure.'};
  return {priority:'watch' as const,category:title||'Company update',reason:'An exchange disclosure is available; materiality has not been established automatically.'};
}

export function inWindow(publishedAt:string,period:'24h'|'7d'|'30d',now:number):boolean {
  const value=Date.parse(publishedAt);
  const duration=period==='24h'?86400000:period==='7d'?7*86400000:30*86400000;
  return Number.isFinite(value)&&value>=now-duration&&value<=now;
}

export function prioritiseFilings(filings:Filing[]) {
  return [...filings].sort((a,b)=>{
    const rank=(p:Filing['priority'])=>p==='review'?0:p==='watch'?1:2;
    return rank(a.priority)-rank(b.priority)||Date.parse(b.publishedAt)-Date.parse(a.publishedAt);
  });
}

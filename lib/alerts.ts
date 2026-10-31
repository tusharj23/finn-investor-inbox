import type { MarketData } from './contracts';

export type AlertSettings={priceEnabled:boolean;priceMovePct:number;volumeEnabled:boolean;volumeMultiple:number};
export type PortfolioAlert={id:string;symbol:string;companyName:string;kind:'price_move'|'volume_spike';sessionDate:string;createdAt:string;observed:number;threshold:number;unit:string;baseline?:number;baselineSessions?:number;sourceUrl?:string;accessedAt?:string;explanation:string};
export type AlertCoverage={symbol:string;latestSession?:string;availableSessions:number;priceStatus:'available'|'missing_previous_close'|'disabled';volumeStatus:'available'|'insufficient_history'|'disabled'|'missing_data';message?:string};
export const DEFAULT_ALERT_SETTINGS:AlertSettings={priceEnabled:true,priceMovePct:5,volumeEnabled:true,volumeMultiple:2};
export function validateAlertSettings(value:unknown):AlertSettings {
  if(!value||typeof value!=='object')throw new Error('Alert settings are required.');
  const v=value as Record<string,unknown>;
  if(typeof v.priceEnabled!=='boolean'||typeof v.volumeEnabled!=='boolean'||typeof v.priceMovePct!=='number'||typeof v.volumeMultiple!=='number'||!Number.isFinite(v.priceMovePct)||!Number.isFinite(v.volumeMultiple)||v.priceMovePct<0.5||v.priceMovePct>25||v.volumeMultiple<1||v.volumeMultiple>10)throw new Error('Use a price threshold from 0.5% to 25% and a volume threshold from 1× to 10×.');
  return {priceEnabled:v.priceEnabled,priceMovePct:v.priceMovePct,volumeEnabled:v.volumeEnabled,volumeMultiple:v.volumeMultiple};
}
export function alertWindowStart(period:'24h'|'7d'|'30d',now:number):number{return now-(period==='24h'?1:period==='7d'?7:30)*86400000;}
function closeAtIst(date:string){return Date.parse(`${date}T15:30:00+05:30`);}

export function calculatePortfolioAlerts(input:{history:MarketData[];companies:{symbol:string;name:string;portfolio?:boolean}[];settings:AlertSettings;period:'24h'|'7d'|'30d';now:number}) {
  const start=alertWindowStart(input.period,input.now);
  const bySymbol=new Map<string,MarketData[]>();
  for(const row of input.history){const symbol=(row.companySymbol||row.symbol||'').toUpperCase().replace(/\.NS$/,'');if(!symbol||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(row.close)||!Number.isFinite(row.volume)||row.close<=0||row.volume<0)continue;const list=bySymbol.get(symbol)||[];list.push({...row,companySymbol:symbol});bySymbol.set(symbol,list);}
  for(const rows of bySymbol.values())rows.sort((a,b)=>a.date.localeCompare(b.date));
  const alerts:PortfolioAlert[]=[];const coverage:AlertCoverage[]=[];
  for(const company of input.companies.filter(c=>c.portfolio!==false)){
    const all=bySymbol.get(company.symbol)||[];
    const inWindow=all.map((row,index)=>({row,index,instant:closeAtIst(row.date)})).filter(item=>item.instant>=start&&item.instant<=input.now);
    const latest=all.at(-1);
    if(!all.length){coverage.push({symbol:company.symbol,availableSessions:0,priceStatus:input.settings.priceEnabled?'missing_previous_close':'disabled',volumeStatus:input.settings.volumeEnabled?'missing_data':'disabled',message:'No EOD price/volume history is available. Refresh prices; thresholds were not treated as zero.'});continue;}
    let priceStatus:AlertCoverage['priceStatus']=input.settings.priceEnabled?'available':'disabled';
    let volumeStatus:AlertCoverage['volumeStatus']=input.settings.volumeEnabled?'available':'disabled';
    let message:string|undefined;
    for(const {row,index} of inWindow){
      const previous=all[index-1];
      if(input.settings.priceEnabled){
        if(!previous||previous.close<=0){priceStatus='missing_previous_close';message='No valid preceding close is available; no price-move alert was calculated.';}
        else {const move=(row.close/previous.close-1)*100;if(Math.abs(move)>=input.settings.priceMovePct)alerts.push({id:`${company.symbol}:${row.date}:price_move`,symbol:company.symbol,companyName:company.name,kind:'price_move',sessionDate:row.date,createdAt:row.accessedAt||new Date(input.now).toISOString(),observed:Number(move.toFixed(2)),threshold:input.settings.priceMovePct,unit:'%',sourceUrl:row.sourceUrl,accessedAt:row.accessedAt,explanation:`EOD close moved ${move>=0?'up':'down'} ${Math.abs(move).toFixed(2)}% from the previous valid NSE session; the configured trigger is ±${input.settings.priceMovePct}%.`});}
      }
      if(input.settings.volumeEnabled){
        const baseline=all.slice(Math.max(0,index-20),index);
        if(baseline.length<20){volumeStatus='insufficient_history';message=`Volume alerts need 20 complete preceding EOD sessions; ${baseline.length} are available. No shorter or zero baseline is substituted.`;}
        else {const average=baseline.reduce((sum,item)=>sum+item.volume,0)/20;if(average<=0){volumeStatus='missing_data';message='The 20-session volume baseline is zero or invalid; no ratio was calculated.';}else{const multiple=row.volume/average;if(multiple>=input.settings.volumeMultiple)alerts.push({id:`${company.symbol}:${row.date}:volume_spike`,symbol:company.symbol,companyName:company.name,kind:'volume_spike',sessionDate:row.date,createdAt:row.accessedAt||new Date(input.now).toISOString(),observed:Number(multiple.toFixed(2)),threshold:input.settings.volumeMultiple,unit:'× average volume',baseline:Number(average.toFixed(2)),baselineSessions:20,sourceUrl:row.sourceUrl,accessedAt:row.accessedAt,explanation:`Traded volume was ${multiple.toFixed(2)}× the mean of the previous 20 valid sessions, excluding this session.`});}}
      }
    }
    if(!inWindow.length)message=`No EOD session falls inside the selected ${input.period==='24h'?'24-hour':input.period==='7d'?'7-day':'30-day'} window. Latest available session: ${latest?.date||'none'}.`;
    coverage.push({symbol:company.symbol,latestSession:latest?.date,availableSessions:all.length,priceStatus,volumeStatus,message});
  }
  const unique=new Map(alerts.map(alert=>[alert.id,alert]));
  return {settings:input.settings,period:input.period,asOf:new Date(input.now).toISOString(),alerts:[...unique.values()].sort((a,b)=>b.sessionDate.localeCompare(a.sessionDate)||a.symbol.localeCompare(b.symbol)||a.kind.localeCompare(b.kind)),coverage};
}

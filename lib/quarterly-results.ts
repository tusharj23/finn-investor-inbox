import type { EvidencePage, PrimaryDocument } from './contracts';

export class QuarterlyResultsError extends Error { status:number;code:string;constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;} }

export type QuarterlyMetric={id:'revenue'|'operating_profit'|'pbt'|'net_profit';label:string;current:number;previousQuarter:number;yearAgo:number;qoq:string;yoy:string};
export type QuarterlyComparison={
  companySymbol:'INFY';
  title:string;
  basis:string;
  unit:string;
  periods:{current:string;previousQuarter:string;yearAgo:string};
  metrics:QuarterlyMetric[];
  omittedMetric:string;
  source:{documentId:string;title:string;page:number;period:string;sourceUrl:string};
  note:string;
};

const sourceMetrics:QuarterlyMetric[]=[
  {id:'revenue',label:'Revenue',current:49244,previousQuarter:48211,yearAgo:44490,qoq:'2.1%',yoy:'10.7%'},
  {id:'operating_profit',label:'Operating profit',current:10330,previousQuarter:10163,yearAgo:9353,qoq:'1.6%',yoy:'10.4%'},
  {id:'pbt',label:'Profit before income taxes (PBT)',current:11063,previousQuarter:11028,yearAgo:10229,qoq:'0.3%',yoy:'8.2%'},
  {id:'net_profit',label:'Net profit after non-controlling interests',current:7823,previousQuarter:7769,yearAgo:7364,qoq:'0.7%',yoy:'6.2%'},
];
// Page text keeps each source row in this order: current, year-ago, YoY, prior-quarter, QoQ.
const sourceRows=[
  ['49,244','44,490','10.7%','48,211','2.1%'],
  ['10,330','9,353','10.4%','10,163','1.6%'],
  ['11,063','10,229','8.2%','11,028','0.3%'],
  ['7,823','7,364','6.2%','7,769','0.7%'],
];

export function quarterlyComparison(document:PrimaryDocument|undefined,page:EvidencePage|undefined):QuarterlyComparison {
  if(!document||document.id!=='infy-results'||document.type!=='exchange_filing')throw new QuarterlyResultsError(404,'quarterly_results_unavailable','A source-backed quarterly comparison is not connected for this filing.');
  if(!page||page.documentId!==document.id||page.page!==6)throw new QuarterlyResultsError(422,'quarterly_evidence_unavailable','The source comparison page is unavailable; no figures were shown. Open the original filing instead.');
  const text=page.text;
  const required=['Consolidated Statement of Comprehensive Income for three months ended','Extracted from IFRS Financial Statement','In ₹ crore, except per equity share data','Sep 30, 2026','Jun 30, 2026','Sep 30, 2025'];
  if(required.some(value=>!text.includes(value))||sourceRows.some(row=>!text.includes(row.join(' '))))throw new QuarterlyResultsError(422,'quarterly_evidence_unavailable','The source page does not contain all required periods, units, and reported values in the expected row order. No comparison was shown.');
  return {
    companySymbol:'INFY',title:'Quarterly results comparison',basis:'Consolidated · IFRS financial-statement extract',unit:'₹ crore',
    periods:{current:'Q2 FY2026–27 · 30 Sep 2026',previousQuarter:'Q1 FY2026–27 · 30 Jun 2026',yearAgo:'Q2 FY2025–26 · 30 Sep 2025'},
    metrics:sourceMetrics.map(metric=>({...metric})),
    omittedMetric:'EBITDA is not separately reported in this source table; no EBITDA value was calculated.',
    source:{documentId:document.id,title:document.title,page:page.page,period:document.period,sourceUrl:document.sourceUrl},
    note:'Amounts and QoQ/YoY rates are reported in the company fact sheet; rates are not recalculated. The filing notes that rounded quarterly figures may not add to half-year totals.',
  };
}

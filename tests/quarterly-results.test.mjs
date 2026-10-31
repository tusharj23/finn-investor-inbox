import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { quarterlyComparison } from '../lib/quarterly-results.ts';

const catalog=JSON.parse(fs.readFileSync(new URL('../lib/data/catalog.json',import.meta.url)));
const pages=JSON.parse(fs.readFileSync(new URL('../lib/data/pages.json',import.meta.url)));
const document=catalog.companies.find(c=>c.symbol==='INFY').documents.find(d=>d.id==='infy-results');
const page=pages.find(p=>p.documentId==='infy-results'&&p.page===6);

test('Infosys comparison preserves three same-basis periods, source-reported units and growth',()=>{
  const result=quarterlyComparison(document,page);
  assert.equal(result.unit,'₹ crore');
  assert.equal(result.basis,'Consolidated · IFRS financial-statement extract');
  assert.deepEqual(result.periods,{current:'Q2 FY2026–27 · 30 Sep 2026',previousQuarter:'Q1 FY2026–27 · 30 Jun 2026',yearAgo:'Q2 FY2025–26 · 30 Sep 2025'});
  assert.deepEqual(result.metrics.map(m=>[m.id,m.current,m.previousQuarter,m.yearAgo,m.qoq,m.yoy]),[
    ['revenue',49244,48211,44490,'2.1%','10.7%'],
    ['operating_profit',10330,10163,9353,'1.6%','10.4%'],
    ['pbt',11063,11028,10229,'0.3%','8.2%'],
    ['net_profit',7823,7769,7364,'0.7%','6.2%'],
  ]);
  assert.match(result.omittedMetric,/EBITDA is not separately reported/);
  assert.equal(result.source.sourceUrl,document.sourceUrl);
  assert.equal(result.source.page,6);
});

test('comparison declines missing or mismatched evidence rather than filling gaps',()=>{
  assert.throws(()=>quarterlyComparison(document,undefined),e=>e.code==='quarterly_evidence_unavailable');
  const shortened={...page,text:page.text.replace('7,823','')};
  assert.throws(()=>quarterlyComparison(document,shortened),e=>e.code==='quarterly_evidence_unavailable');
  const other={...document,id:'tcs-transcript',type:'earnings_call_transcript'};
  assert.throws(()=>quarterlyComparison(other,page),e=>e.code==='quarterly_results_unavailable');
});

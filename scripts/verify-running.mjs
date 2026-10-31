import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = process.argv[2] || 'http://127.0.0.1:5173';
if (!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error('Pass the owned local server origin.');
const results = [];
async function check(name, action) {
  try { await action(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, passed: false, message: error.message }); console.error('FAIL', name, error.message); }
}
const post = (body, headers = {}) => fetch(origin + '/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
let catalog;
await check('Rendered root and browser assets respond', async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /FINN/);
  assert.match(html, /Opening verified filings/);
  const asset = html.match(/<script[^>]+src="([^"]+)"/);
  assert.ok(asset);
  assert.equal((await fetch(new URL(asset[1], origin))).status, 200);
});
await check('Catalog exposes dated partial coverage and 15 portfolio companies and independent holdouts', async () => {
  const response = await fetch(origin + '/api/catalog');
  assert.equal(response.status, 200);
  catalog = await response.json();
  assert.equal(catalog.companies.filter(c => c.membership?.portfolio).length, 15);
  assert.deepEqual(catalog.coverage.researchExamples.sort(), ['APLAPOLLO','INFY','ITC','TCS']);
  assert.ok(catalog.companies.every(c => c.sourceStates));
  for (const symbol of ['CERA','HAVELLS']) assert.deepEqual(catalog.companies.find(c=>c.symbol===symbol).membership,{portfolio:false,researchExample:false});
  assert.ok(catalog.companies.find(c=>c.symbol==='ITC').sourceStates.documents.error);
  assert.ok(catalog.companies.filter(c=>c.membership?.portfolio).every(c=>c.market?.date==='2026-10-30')); 
  const itc=catalog.companies.find(c=>c.symbol==='ITC');
  assert.ok(itc.documents.some(d=>d.type==='annual_report'));
  assert.ok(!itc.documents.some(d=>d.type==='earnings_call_transcript'));
  assert.equal(itc.sourceStates.documents.status,'partial');
  assert.equal(catalog.coverage.isLive, false);
  assert.ok(catalog.filings.length >= 200);
  assert.ok(catalog.filings.filter(f=>!f.historical).every(f=>Date.parse(f.publishedAt)<=Date.now()));
  assert.doesNotMatch(JSON.stringify(catalog), /\/Users\/|rawFile|localFile/);
});
await check('Real filing evidence has original URL and exact PDF page', async () => {
  const response = await fetch(origin + '/api/evidence?documentId=infy-results&page=1');
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.passage.page, 1);
  assert.match(data.document.sourceUrl, /^https:\/\/nsearchives.nseindia.com\//);
  assert.match(data.passage.text, /September 30, 2026/);
});
await check('Quarterly comparison uses the connected Infosys source page and refuses unsupported filings', async () => {
  const response=await fetch(origin+'/api/quarterly?documentId=infy-results');
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.unit,'₹ crore');
  assert.match(data.basis,/Consolidated.*IFRS/);
  assert.equal(data.source.page,6);
  assert.equal(data.source.sourceUrl,catalog.companies.find(c=>c.symbol==='INFY').documents.find(d=>d.id==='infy-results').sourceUrl);
  assert.deepEqual(data.metrics.map(m=>m.id),['revenue','operating_profit','pbt','net_profit']);
  assert.match(data.omittedMetric,/EBITDA is not separately reported/);
  const evidence=await(await fetch(origin+'/api/evidence?documentId=infy-results&page=6')).json();
  for(const value of ['49,244','48,211','44,490','10,330','10,163','9,353','11,063','11,028','10,229','7,823','7,769','7,364'])assert.ok(evidence.passage.text.includes(value));
  const unsupported=await fetch(origin+'/api/quarterly?documentId=tcs-transcript');
  assert.equal(unsupported.status,404);
});
await check('EOD alert refresh uses stored history, configured thresholds, and stable IDs', async () => {
  const body={settings:{priceEnabled:true,priceMovePct:5,volumeEnabled:true,volumeMultiple:2},period:'24h'};
  const first=await (await fetch(origin+'/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();
  const second=await (await fetch(origin+'/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();
  assert.equal(first.period,'24h');assert.equal(first.coverage.length,15);
  assert.ok(first.coverage.some(item=>item.availableSessions>=20));
  assert.ok(first.alerts.length>0);
  assert.equal(new Set(first.alerts.map(item=>item.id)).size,first.alerts.length);
  assert.deepEqual(first.alerts.map(item=>item.id),second.alerts.map(item=>item.id));
  const week=await (await fetch(origin+'/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,period:'7d',settings:{...body.settings,priceMovePct:10}})})).json();
  assert.equal(week.period,'7d');
  assert.equal(week.settings.priceMovePct,10);
  const invalid=await fetch(origin+'/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,settings:{...body.settings,priceMovePct:26}})});
  assert.equal(invalid.status,400);
});
await check('A well-formed but unlisted ticker is rejected by independent NSE resolution', async () => {
  const before=catalog.companies.length;
  const response=await fetch(origin+'/api/companies/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol:'NOTREAL123'})});
  assert.equal(response.status,400);
  assert.match((await response.json()).error.message,/absent from the fetched NSE equity directory/);
  const after=await (await fetch(origin+'/api/catalog')).json();
  assert.equal(after.companies.length,before);
});
for (const companySymbol of ['INFY', 'TCS','ITC','APLAPOLLO','CERA','HAVELLS']) {
  await check(companySymbol + ' question returns exact source-supported response', async () => {
    const response = await post({ companySymbol, question: companySymbol === 'ITC' ? 'What risks does management identify?' : "What is management's outlook?" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const data = await response.json();
    assert.equal(data.mode, 'extractive');
    assert.ok(['reported_fact','management_statement'].includes(data.claimType));
    assert.ok(Array.isArray(data.calculations)&&Array.isArray(data.inferences)&&Array.isArray(data.missingEvidence));
    assert.equal(data.companySymbol, companySymbol);
    assert.ok(data.citations[0].documentId.startsWith(companySymbol.toLowerCase()));
    assert.ok(data.citations[0].passage.length > 50);
    const quoted=data.answer.match(/“([\s\S]*?)”/);
    assert.ok(quoted&&quoted[1].length>50);
    assert.ok(data.citations[0].passage.includes(quoted[1].slice(0,80)));
    if (companySymbol === 'INFY') { assert.match(data.answer, /1% to 2%/); assert.equal(data.citations[0].page, 26); }
    else if(companySymbol==='TCS') { assert.match(data.answer, /don't provide any specific revenue or earnings guidance/); assert.equal(data.citations[0].page, 3); }
    const evidence = await (await fetch(origin+'/api/evidence?documentId='+encodeURIComponent(data.citations[0].documentId)+'&page='+data.citations[0].page)).json();
    assert.equal(evidence.document.id,data.citations[0].documentId);
    assert.equal(evidence.document.sourceUrl,data.citations[0].sourceUrl);
    assert.equal(evidence.passage.page,data.citations[0].page);
  });
}
await check('Discovered but unindexed documents have an explicit processing state', async () => { const r=await post({companySymbol:'VGUARD',question:'What is the outlook?'});assert.equal(r.status,503);assert.equal((await r.json()).error.code,'documents_unindexed'); });
await check('Unknown company returns honest 404', async () => { const r = await post({ companySymbol: 'NOTREAL123', question: 'What is the outlook?' }); assert.equal(r.status, 404); assert.match((await r.json()).error.message, /not connected/); });
await check('Unsupported question returns insufficient evidence', async () => { const r = await post({ companySymbol: 'INFY', question: 'What is the bitcoin price?' }); assert.equal(r.status, 422); assert.equal((await r.json()).error.code, 'insufficient_evidence'); });
await check('Malformed and oversized inputs are bounded', async () => { assert.equal((await post('{broken')).status, 400); assert.equal((await post(' '.repeat(5000))).status, 413); });
await check('Cross-origin research requests rejected', async () => { assert.equal((await post({ companySymbol: 'INFY', question: 'Outlook?' }, { Origin: 'https://unrelated.example' })).status, 403); });
await check('Ingestion writes require a server-only credential', async () => { assert.equal((await fetch(origin+'/api/ingest/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401); });
await check('Unknown document IDs cannot read filesystem paths', async () => { const r = await fetch(origin + '/api/evidence?documentId=../../.env&page=1'); assert.equal(r.status, 400); });
await check('Cached originals are real PDF bytes', async () => {
  for (const company of catalog.companies) for (const doc of company.documents) {
    const path = doc.localPdfUrl || doc.localEvidencePdfUrl;
    if (!path) continue;
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.equal(new TextDecoder().decode(new Uint8Array(await response.arrayBuffer()).slice(0, 5)), '%PDF-');
  }
});
await check('Local secret files and server corpus are not public routes', async () => {
  for (const path of ['/.env', '/.dev.vars', '/lib/data/pages.json']) { const r = await fetch(origin + path); assert.equal(r.status, 404); }
});
await check('Client build excludes source corpus and key references', async () => {
  const { readdir } = await import('node:fs/promises');
  async function walk(path) { const out = []; for (const f of await readdir(path, { withFileTypes: true })) { if (f.isDirectory()) out.push(...await walk(resolve(path, f.name))); else if (f.name.endsWith('.js')) out.push(resolve(path, f.name)); } return out; }
  const files = await walk(resolve('dist/client'));
  assert.ok(files.length > 0);
  for (const file of files) { const body = await readFile(file, 'utf8'); assert.doesNotMatch(body, /revenue growth guidance is 1% to 2%|OPENAI_API_KEY|ANTHROPIC_API_KEY/); }
});
await mkdir('verification', { recursive: true });
await writeFile('verification/running-checks.json', JSON.stringify({ testedAt: new Date().toISOString(), origin, results }, null, 2));
if (results.some(r => !r.passed)) process.exitCode = 1;

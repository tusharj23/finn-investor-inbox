import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { applyBatch, getCatalog, getResearchData, getMarketHistory, mergeSourceState, presentSourceState, canonicalSourceUrl } from '../lib/store.ts';

function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../ingestion/schema.sql', import.meta.url), 'utf8'));
  const adapter = {
    sql,
    prepare(query) {
      let parameters = [];
      const statement = {
        bind(...values) { parameters = values; return statement; },
        async all() { return { success: true, results: sql.prepare(query).all(...parameters) }; },
        async first() { return sql.prepare(query).get(...parameters) ?? null; },
        async run() { sql.prepare(query).run(...parameters); return { success: true }; },
      };
      return statement;
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try { const result = []; for (const statement of statements) result.push(await statement.run()); sql.exec('COMMIT'); return result; }
      catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
  };
  return adapter;
}

const sourceAt = '2026-10-30T12:30:00Z';
const document = { id: 'alpha-transcript', companySymbol: 'ALPHA', title: 'Alpha earnings call', type: 'earnings_call_transcript', period: 'Q1 FY2026-27', sourceUrl: 'https://www.bseindia.com/xml-data/corpfiling/AttachHis/example.pdf', accessedAt: sourceAt, pdfPages: 5, sha256: 'a'.repeat(64) };
const fixture = () => ({
  finishedAt: sourceAt,
  companies: [{ symbol: 'ALPHA', name: 'Alpha Limited', sector: 'Manufacturing', membership: { portfolio: true, researchExample: true }, documents: [] }],
  documents: [document],
  filings: [{ id: 'alpha-filing', companySymbol: 'ALPHA', title: 'Earnings transcript', category: 'Earnings call', priority: 'watch', reason: 'Primary management discussion', publishedAt: '2026-08-12T00:00:00+05:30', historical: true, summary: 'Call record', sourceUrl: document.sourceUrl, documentId: document.id }],
  pages: [{ id: 'alpha-transcript:2', documentId: document.id, companySymbol: 'ALPHA', page: 2, text: 'Management expects healthy demand and discusses the source evidence in its earnings call.' }],
  market: [{ companySymbol: 'ALPHA', close: 100, volume: 12345, date: '2026-10-29', sourceUrl: 'https://market.example/ALPHA', accessedAt: sourceAt }],
  sourceStates: [
    { companySymbol: 'ALPHA', source: 'prices', status: 'success', lastAttemptAt: sourceAt, lastSuccessAt: sourceAt, dataAsOf: '2026-10-29', fromCache: false },
    { companySymbol: 'ALPHA', source: 'announcements', status: 'success', lastAttemptAt: sourceAt, lastSuccessAt: sourceAt, dataAsOf: sourceAt, fromCache: false },
    { companySymbol: 'ALPHA', source: 'documents', status: 'success', lastAttemptAt: sourceAt, lastSuccessAt: sourceAt, dataAsOf: 'Q1 FY2026-27', fromCache: false },
  ],
});

test('repeating the same batch is idempotent for companies, filings, documents, and physical pages', async () => {
  const db = database();
  await applyBatch(db, fixture());
  await applyBatch(db, fixture());
  for (const table of ['companies', 'filings', 'documents', 'pages']) assert.equal(db.sql.prepare(`SELECT count(*) AS count FROM ${table}`).get().count, 1);
  const catalog = await getCatalog(db);
  assert.equal(catalog.coverage.portfolioCount, 1);
  assert.deepEqual(catalog.coverage.researchExamples, ['ALPHA']);
  assert.equal(catalog.filings[0].publishedAt, '2026-08-12T00:00:00+05:30');
  assert.equal(catalog.filings[0].historical, true);
  assert.equal(catalog.companies[0].market.volume, 12345);
});

test('mirrored or redirected documents retain one identity and remap citation pages', async () => {
  const db = database();
  await applyBatch(db, fixture());
  const batch = fixture();
  batch.documents[0] = { ...document, id: 'different-id', sourceUrl: 'https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=example.pdf' };
  batch.filings[0] = { ...batch.filings[0], id: 'alternate-filing-id', sourceUrl: document.sourceUrl + '#page=1', documentId: 'different-id' };
  batch.pages[0] = { ...batch.pages[0], documentId: 'different-id' };
  const result = await applyBatch(db, batch);
  assert.equal(result.documentIdMap['different-id'], 'alpha-transcript');
  assert.equal(db.sql.prepare('SELECT count(*) AS count FROM documents').get().count, 1);
  assert.equal(db.sql.prepare('SELECT count(*) AS count FROM filings').get().count, 1);
  assert.equal(db.sql.prepare('SELECT count(*) AS count FROM pages').get().count, 1);
  const data = await getResearchData(db, 'ALPHA');
  assert.equal(data.pages[0].documentId, 'alpha-transcript');
  assert.equal(data.catalog.filings[0].documentId, 'alpha-transcript');
});

test('a failed refresh retains last good price, document, period, and successful fetch time', async () => {
  const db = database();
  await applyBatch(db, fixture());
  await applyBatch(db, { finishedAt: '2026-10-30T13:00:00Z', companies: [{ symbol: 'ALPHA', name: 'Alpha Limited', sector: 'Manufacturing', documents: [] }], sourceStates: [{ companySymbol: 'ALPHA', source: 'prices', status: 'error', lastAttemptAt: '2026-10-30T13:00:00Z', error: 'Provider returned 429' }] });
  const catalog = await getCatalog(db);
  assert.equal(catalog.companies[0].market.close, 100);
  assert.equal(catalog.companies[0].documents[0].period, 'Q1 FY2026-27');
  assert.equal(catalog.companies[0].membership.portfolio, true);
  const state = catalog.companies[0].sourceStates.prices;
  assert.equal(state.status, 'error');
  assert.equal(state.lastSuccessAt, sourceAt);
  assert.equal(state.asOf, '2026-10-29');
  assert.equal(state.lastAttemptAt, '2026-10-30T13:00:00Z');
});

test('resolution creates a company independent of portfolio and research membership', async () => {
  const db = database();
  await applyBatch(db, fixture());
  await applyBatch(db, { companies: [{ symbol: 'UNSEEN', name: 'Unseen Limited', sector: 'Consumer', documents: [] }] });
  const catalog = await getCatalog(db);
  assert.equal(catalog.companies.length, 2);
  assert.equal(catalog.coverage.portfolioCount, 1);
  assert.deepEqual(catalog.coverage.researchExamples, ['ALPHA']);
  assert.deepEqual(catalog.companies.find(c => c.symbol === 'UNSEEN').membership, { portfolio: false, researchExample: false });
});

test('freshness uses acquisition time, not weekends, session age, or an old fiscal reporting period', () => {
  const at = Date.parse('2026-10-30T13:00:00Z');
  const base = { companySymbol: 'A', source: 'prices', status: 'success', lastSuccessAt: sourceAt, dataAsOf: '2026-10-29' };
  assert.equal(presentSourceState(base, 'A', 'prices', true, at).status, 'fresh');
  assert.equal(presentSourceState({ ...base, source: 'documents', dataAsOf: 'FY2023-24' }, 'A', 'documents', true, at).status, 'fresh');
  assert.equal(presentSourceState({ ...base, lastSuccessAt: '2026-10-28T10:00:00Z' }, 'A', 'prices', true, at).status, 'stale');
  assert.equal(presentSourceState({ ...base, fromCache: true }, 'A', 'prices', true, at).status, 'cached');
});

test('failed D1 access propagates instead of silently displaying the old baseline', async () => {
  await assert.rejects(getCatalog({ prepare() { throw new Error('Database unavailable'); } }), /Database unavailable/);
});

test('source-state failures keep a distinct attempt date and canonical URLs ignore presentation fragments', () => {
  const merged = mergeSourceState({ companySymbol: 'A', source: 'prices', status: 'success', lastSuccessAt: sourceAt, dataAsOf: '2026-10-29' }, { companySymbol: 'A', source: 'prices', status: 'error', lastAttemptAt: '2026-10-30T14:00:00Z', error: '503' });
  assert.equal(merged.lastSuccessAt, sourceAt);
  assert.equal(merged.dataAsOf, '2026-10-29');
  assert.equal(canonicalSourceUrl('https://company.example/report.pdf?utm_source=mail#page=3'), 'https://company.example/report.pdf');
});

test('changed PDF bytes at the same URL retain the old version and its citations', async () => {
  const db=database();await applyBatch(db,fixture());
  await applyBatch(db,{documents:[{...document,id:'new-version',sha256:'b'.repeat(64),pdfPages:2}],pages:[{documentId:'new-version',page:1,companySymbol:'ALPHA',text:'A revised document.'}]});
  const data=await getResearchData(db,'ALPHA');
  assert.equal(data.catalog.companies[0].documents.length,2);
  assert.equal(data.pages.length,2);
  assert.equal(data.pages.find(p=>p.documentId==='alpha-transcript').page,2);
});

test('filings without attachments retain distinct exchange sequence identities', async () => {
  const db=database();const batch=fixture();const f=batch.filings[0];
  batch.filings=[{...f,id:'one',sourceUrl:'https://www.nseindia.com/api/corporate-announcements',exchangeSequenceId:'1'},{...f,id:'two',sourceUrl:'https://www.nseindia.com/api/corporate-announcements',exchangeSequenceId:'2'}];
  await applyBatch(db,batch);await applyBatch(db,batch);
  assert.equal((await getCatalog(db)).filings.length,2);
});

test('discovery cannot downgrade indexed evidence and partial source failures remain visible', async () => {
  const db=database();await applyBatch(db,fixture());
  await applyBatch(db,{documents:[{...document,id:'discovered',pdfPages:0,period:'Unverified',sha256:undefined}],sourceStates:[{companySymbol:'ALPHA',source:'documents',status:'partial',error:'Transcript unavailable',lastAttemptAt:sourceAt,lastSuccessAt:sourceAt}]});
  const company=(await getCatalog(db)).companies[0];
  assert.equal(company.documents.length,1);assert.equal(company.documents[0].pdfPages,5);
  assert.equal(company.sourceStates.documents.status,'partial');assert.match(company.sourceStates.documents.message,/Transcript unavailable/);
});

test('importing an older cached batch cannot roll back a newer successful refresh', async () => {
  const db=database();await applyBatch(db,fixture());
  await applyBatch(db,{market:[{companySymbol:'ALPHA',close:102,volume:14000,date:'2026-10-29',accessedAt:'2026-10-30T14:00:00Z'}],sourceStates:[{companySymbol:'ALPHA',source:'prices',status:'success',lastAttemptAt:'2026-10-30T14:00:00Z',lastSuccessAt:'2026-10-30T14:00:00Z',dataAsOf:'2026-10-29'}]});
  const earlier=fixture();earlier.companies[0].market=earlier.market[0];await applyBatch(db,earlier);
  const company=(await getCatalog(db)).companies[0];
  assert.equal(company.market.close,102);assert.equal(company.sourceStates.prices.lastSuccessAt,'2026-10-30T14:00:00Z');
});

test('EOD history upserts are deduplicated and an older refresh cannot replace a newer observation', async () => {
  const db=database();
  await applyBatch(db,{companies:[{symbol:'ALPHA',name:'Alpha Limited',sector:'Manufacturing',membership:{portfolio:true,researchExample:false},documents:[]}],history:[{companySymbol:'ALPHA',date:'2026-10-30',close:105,volume:2000,accessedAt:'2026-10-30T14:00:00Z',sourceUrl:'https://prices.example/a'}]});
  await applyBatch(db,{history:[{companySymbol:'ALPHA',date:'2026-10-30',close:105,volume:2000,accessedAt:'2026-10-30T14:00:00Z',sourceUrl:'https://prices.example/a'}]});
  await applyBatch(db,{history:[{companySymbol:'ALPHA',date:'2026-10-30',close:99,volume:1,accessedAt:'2026-10-30T13:00:00Z',sourceUrl:'https://prices.example/old'}]});
  assert.equal(db.sql.prepare('SELECT count(*) AS count FROM market_history').get().count,1);
  const history=await getMarketHistory(db,['ALPHA']);
  assert.equal(history[0].close,105);assert.equal(history[0].accessedAt,'2026-10-30T14:00:00Z');
});

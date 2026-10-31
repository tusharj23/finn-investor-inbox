import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePortfolioAlerts, DEFAULT_ALERT_SETTINGS, alertWindowStart } from '../lib/alerts.ts';

const company = [{ symbol: 'ALPHA', name: 'Alpha Limited', portfolio: true }];
const row = (date, close, volume) => ({ companySymbol: 'ALPHA', date, close, volume, sourceUrl: 'https://prices.example/ALPHA', accessedAt: '2026-10-31T12:00:00Z' });
const sessions = (count, lastDate='2026-10-30') => {
  const end = new Date(`${lastDate}T00:00:00Z`);
  return Array.from({length:count}, (_, i) => { const d=new Date(end); d.setUTCDate(end.getUTCDate()-(count-1-i)); return row(d.toISOString().slice(0,10),100,1000); });
};
const run = (history, now=Date.parse('2026-10-31T12:00:00Z'), settings=DEFAULT_ALERT_SETTINGS, period='24h') => calculatePortfolioAlerts({history,companies:company,settings,period,now});

test('defaults document inclusive 5% close and 2x volume triggers with a 20-session baseline', () => {
  const history=sessions(20); history.push(row('2026-10-31',105,2000));
  const result=run(history,Date.parse('2026-10-31T15:00:00Z'));
  assert.deepEqual(result.alerts.map(a=>a.kind).sort(),['price_move','volume_spike']);
  assert.equal(result.alerts.find(a=>a.kind==='volume_spike').baselineSessions,20);
  assert.equal(result.alerts.find(a=>a.kind==='volume_spike').baseline,1000);
  assert.match(result.alerts[0].explanation,/previous valid NSE session|previous 20 valid sessions/);
});

test('window start is inclusive and later sessions and future sessions are excluded', () => {
  const now=Date.parse('2026-10-31T12:00:00Z');
  assert.equal(alertWindowStart('24h',now),Date.parse('2026-10-30T12:00:00Z'));
  const result=run([row('2026-10-30',100,1000),row('2026-10-31',110,3000),row('2026-11-01',120,5000)],now,{...DEFAULT_ALERT_SETTINGS,volumeEnabled:false});
  assert.deepEqual(result.alerts.map(a=>a.sessionDate),['2026-10-31']);
});

test('refreshing the same prices yields stable unique alert IDs', () => {
  const history=[...sessions(20),row('2026-10-30',110,3000)];
  const first=run(history), second=run([...history,...history]);
  assert.deepEqual(first.alerts.map(a=>a.id),second.alerts.map(a=>a.id));
  assert.equal(new Set(second.alerts.map(a=>a.id)).size,second.alerts.length);
});

test('user threshold changes apply without changing the fixed historical baseline', () => {
  const history=[...sessions(20),row('2026-10-31',104,1500)];
  const now=Date.parse('2026-10-31T15:00:00Z');
  assert.equal(run(history,now).alerts.length,0);
  const changed=run(history,now,{...DEFAULT_ALERT_SETTINGS,priceMovePct:4,volumeMultiple:1.5});
  assert.deepEqual(changed.alerts.map(a=>a.kind).sort(),['price_move','volume_spike']);
});

test('missing data and insufficient baseline are explicit and never treated as zero', () => {
  const absent=run([]);
  assert.match(absent.coverage[0].message,/No EOD price\/volume history/);
  const short=run([row('2026-10-31',110,5000)],Date.parse('2026-10-31T15:00:00Z'));
  assert.equal(short.alerts.length,0);
  assert.equal(short.coverage[0].priceStatus,'missing_previous_close');
  assert.equal(short.coverage[0].volumeStatus,'insufficient_history');
  assert.match(short.coverage[0].message,/20 complete preceding/);
});

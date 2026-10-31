import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDisclosure, inWindow, prioritiseFilings } from '../lib/prioritization.ts';

test('meeting notices, announced outcomes, and routine follow-through have separate labels', () => {
  const notice=classifyDisclosure('Board Meeting Intimation','The board is scheduled to consider unaudited financial results.');
  assert.equal(notice.category,'Meeting notice');assert.equal(notice.priority,'watch');assert.match(notice.reason,/does not report approved results/);
  const outcome=classifyDisclosure('Outcome of Board Meeting','The board approved the unaudited financial results for the quarter ended 30 September 2026.');
  assert.equal(outcome.category,'Results released');assert.equal(outcome.priority,'review');
  const press=classifyDisclosure('Press release','The company discusses its financial results.');
  assert.notEqual(press.category,'Results released');
  const routine=classifyDisclosure('Newspaper publication','The financial results advertisement is published.');
  assert.equal(routine.priority,'routine');
});

test('filing periods include the exact cutoff, exclude future items, and preserve routine records', () => {
  const now=Date.parse('2026-10-31T12:00:00+05:30');
  assert.equal(inWindow('2026-10-30T12:00:00+05:30','24h',now),true);
  assert.equal(inWindow('2026-10-30T11:59:59+05:30','24h',now),false);
  assert.equal(inWindow('2026-10-31T12:00:01+05:30','24h',now),false);
  const filings=[
    {priority:'routine',publishedAt:'2026-10-31T11:00:00+05:30'},
    {priority:'watch',publishedAt:'2026-10-31T10:00:00+05:30'},
    {priority:'review',publishedAt:'2026-10-30T13:00:00+05:30'},
  ];
  assert.deepEqual(prioritiseFilings(filings).map(f=>f.priority),['review','watch','routine']);
});

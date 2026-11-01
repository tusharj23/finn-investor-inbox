import test from "node:test";
import assert from "node:assert/strict";
import { groupAnnouncements } from "../lib/digest.ts";

const company = { symbol: "ALPHA", name: "Alpha Industries", sector: "Industrials", documents: [] };
const filing = (id, title, date, sourceUrl, summary = title, priority = "watch") => ({
  id, companySymbol: "ALPHA", title, category: "Company update", priority,
  reason: "Inspect the original disclosure.", publishedAt: date, summary, sourceUrl,
});

test("digest removes exact source repeats and groups a same-period results presentation", () => {
  const values = [
    filing("results", "Outcome of Board Meeting: Financial Results Q2 FY2026-27", "2026-10-28T10:00:00+05:30", "https://bseindia.com/results.pdf", "Financial results approved for Q2 FY2026-27", "review"),
    filing("repeat", "Duplicate row", "2026-10-28T10:00:00+05:30", "https://bseindia.com/results.pdf?utm_source=copy"),
    filing("deck", "Investor Presentation Q2 FY2026-27", "2026-10-29T10:00:00+05:30", "https://bseindia.com/deck.pdf", "Investor presentation Q2 FY2026-27"),
  ];
  const groups = groupAnnouncements(values, [company]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].items.map(item => item.id).sort(), ["deck", "results"]);
  assert.equal(groups[0].priority, "review");
});

test("meeting notices and unrelated company events remain separate, with original sources retained", () => {
  const values = [
    filing("notice", "Board Meeting Intimation", "2026-10-28T10:00:00+05:30", "https://bseindia.com/notice.pdf", "Meeting scheduled to consider results"),
    filing("acquisition", "Acquisition of subsidiary", "2026-10-28T11:00:00+05:30", "https://bseindia.com/acquisition.pdf", "Company acquired a subsidiary"),
  ];
  const groups = groupAnnouncements(values, [company]);
  assert.equal(groups.length, 2);
  assert.ok(groups.every(group => group.items.length === 1));
  assert.equal(groups.find(group => group.key.includes("notice"))?.headline, "Upcoming board meeting");
  assert.deepEqual(new Set(groups.flatMap(group => group.items.map(item => item.sourceUrl))), new Set(["https://bseindia.com/notice.pdf", "https://bseindia.com/acquisition.pdf"]));
});

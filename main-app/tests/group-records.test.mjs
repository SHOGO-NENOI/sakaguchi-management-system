import test from "node:test";
import assert from "node:assert/strict";
import { groupRecordsByDate, splitUpcomingRecords } from "../app/lib/group-records.ts";

test("同じ日の3現場を一つの日付枠にまとめ、各予定を残す", () => {
  const entries = [
    { date: "2026-09-17", site: "現場A" },
    { date: "2026-09-17", site: "現場B" },
    { date: "2026-09-17", site: "現場C" },
    { date: "2026-09-16", site: "現場D" },
  ];
  const groups = groupRecordsByDate(entries);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].entries.map((entry) => entry.site), ["現場A", "現場B", "現場C"]);
  assert.equal(groups[1].date, "2026-09-16");
  assert.equal(entries.length, 4);
});

test("予定を今日・明日・それ以降に一度ずつ分ける", () => {
  const records = [
    { date: "2026-09-19", site: "今日" },
    { date: "2026-09-20", site: "明日" },
    { date: "2026-09-21", site: "以降" },
  ];
  const result = splitUpcomingRecords(records, "2026-09-19", "2026-09-20");
  assert.deepEqual(Object.values(result).flat().map((entry) => entry.site), ["今日", "明日", "以降"]);
});

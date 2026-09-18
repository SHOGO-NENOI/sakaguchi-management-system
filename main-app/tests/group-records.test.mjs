import test from "node:test";
import assert from "node:assert/strict";
import { groupRecordsByDate } from "../app/lib/group-records.ts";

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

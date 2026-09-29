import test from "node:test";
import assert from "node:assert/strict";
import { breakMinutesForEntry, netWorkMinutes } from "../app/lib/work-time.ts";
import { calculateWeeklyOvertimeMinutes } from "../app/lib/overtime.ts";

test("1日勤務と半日勤務に別々の休憩設定を適用する", () => {
  assert.equal(breakMinutesForEntry("1日", 540, 60, 15), 60);
  assert.equal(breakMinutesForEntry("半日", 300, 60, 15), 15);
  assert.equal(breakMinutesForEntry("休み", 0, 60, 15), 0);
});

test("総労働時間から休憩を1回だけ控除する", () => {
  assert.equal(netWorkMinutes("1日", 540, 60, 0), 480);
  assert.equal(netWorkMinutes("半日", 240, 60, 0), 240);
});

test("休憩時間が勤務時間を超えてもマイナスにしない", () => {
  assert.equal(netWorkMinutes("半日", 30, 60, 90), 0);
});

test("8時から17時を5日勤務し各60分休憩なら週40時間超過はない", () => {
  const records = Array.from({ length: 5 }, () => ({
    week: "2026-09-20",
    workMinutes: netWorkMinutes("1日", 9 * 60, 60, 0),
    earlyMinutes: 0,
    dailyOvertimeMinutes: 0,
  }));
  assert.equal(calculateWeeklyOvertimeMinutes(records), 0);
});

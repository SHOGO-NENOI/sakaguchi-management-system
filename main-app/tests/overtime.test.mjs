import test from "node:test";
import assert from "node:assert/strict";
import { calculateWeeklyOvertimeMinutes } from "../app/lib/overtime.ts";

test("同じ週の40時間超過分を残業時間として計算する", () => {
  const entries = Array.from({ length: 5 }, () => ({
    week: "2026-09-20",
    workMinutes: 9 * 60,
    earlyMinutes: 0,
    dailyOvertimeMinutes: 0,
  }));
  assert.equal(calculateWeeklyOvertimeMinutes(entries), 5 * 60);
});

test("17時以降の残業分を週40時間超過へ二重計上しない", () => {
  const entries = Array.from({ length: 5 }, () => ({
    week: "2026-09-20",
    workMinutes: 10 * 60,
    earlyMinutes: 0,
    dailyOvertimeMinutes: 60,
  }));
  assert.equal(calculateWeeklyOvertimeMinutes(entries), 5 * 60);
});

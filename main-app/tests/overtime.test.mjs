import test from "node:test";
import assert from "node:assert/strict";
import { calculateWeeklyOvertimeMinutes } from "../app/lib/overtime.ts";

test("早出・残業を含む日曜〜土曜の実働が40時間を超えた分だけ計算する", () => {
  const entries = [
    ...Array.from({ length: 4 }, () => ({ week: "2026-09-20", workMinutes: 9 * 60 })),
    { week: "2026-09-20", workMinutes: 8 * 60 },
  ];
  assert.equal(calculateWeeklyOvertimeMinutes(entries, "2026-09-27"), 4 * 60);
});

test("週の実働合計が40時間なら時間外はない", () => {
  const entries = [
    ...Array.from({ length: 4 }, () => ({ week: "2026-09-20", workMinutes: 9 * 60 })),
    { week: "2026-09-20", workMinutes: 4 * 60 },
  ];
  assert.equal(calculateWeeklyOvertimeMinutes(entries, "2026-09-27"), 0);
});

test("土曜日が終わるまでは時間外を確定しない", () => {
  const entries = Array.from({ length: 5 }, () => ({
    week: "2026-09-20",
    workMinutes: 9 * 60,
  }));
  assert.equal(calculateWeeklyOvertimeMinutes(entries, "2026-09-26"), 0);
  assert.equal(calculateWeeklyOvertimeMinutes(entries, "2026-09-27"), 5 * 60);
});

test("週ごとに40時間超過を分けて合計する", () => {
  const entries = [
    { week: "2026-09-13", workMinutes: 42 * 60 },
    { week: "2026-09-20", workMinutes: 43 * 60 },
  ];
  assert.equal(calculateWeeklyOvertimeMinutes(entries, "2026-09-27"), 5 * 60);
});

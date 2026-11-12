import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveOvertimePay,
  tripAllowanceUnits,
} from "../app/lib/payroll.ts";

test("固定時間外手当と週40時間超過分の高い方を使う", () => {
  assert.deepEqual(resolveOvertimePay(31_641, 50_000, 1), {
    amount: 50_000,
    fixedApplied: true,
  });
  assert.deepEqual(resolveOvertimePay(55_000, 50_000, 1), {
    amount: 55_000,
    fixedApplied: false,
  });
  assert.equal(resolveOvertimePay(0, 50_000, 12).amount, 600_000);
});

test("出張手当を出張日数または宿泊日数で数える", () => {
  assert.equal(tripAllowanceUnits("trip-day", 12, 9), 12);
  assert.equal(tripAllowanceUnits("hotel-night", 12, 9), 9);
});

test("10月給与明細の支給総額を再現する", () => {
  const base = 10_000 * 24.5;
  const overtime = resolveOvertimePay(31_641, 50_000, 1).amount;
  const trip = tripAllowanceUnits("hotel-night", 12, 9) * 1_500;
  const gross = base + overtime + trip + 15_000 + 1_000;
  assert.equal(gross, 324_500);
});

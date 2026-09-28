import test from "node:test";
import assert from "node:assert/strict";
import { estimateMonthlyIncomeTax } from "../app/lib/income-tax.ts";

test("国税庁の令和8年分公式例と同じ所得税額を計算する", () => {
  assert.equal(estimateMonthlyIncomeTax(175_000, 0, 2), 210);
  assert.equal(estimateMonthlyIncomeTax(446_000, 0, 8), 940);
  assert.equal(estimateMonthlyIncomeTax(775_200, 0, 3), 59_470);
});

test("社会保険料と扶養人数を所得税計算へ反映する", () => {
  assert.equal(estimateMonthlyIncomeTax(420_000, 63_087, 2), 7_000);
  assert.equal(estimateMonthlyIncomeTax(100_000, 15_000, 0), 0);
});

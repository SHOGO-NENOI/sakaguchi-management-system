import test from "node:test";
import assert from "node:assert/strict";
import { estimateKumamotoResidentTax } from "../app/lib/resident-tax.ts";

test("熊本市の非課税基準と均等割を反映する", () => {
  assert.deepEqual(estimateKumamotoResidentTax(1_065_000, 0, 0), {
    annual: 0,
    monthly: 0,
  });
  assert.deepEqual(estimateKumamotoResidentTax(1_100_000, 0, 0), {
    annual: 5_500,
    monthly: 458,
  });
});

test("年収、社会保険料、扶養人数から熊本市住民税を概算する", () => {
  assert.deepEqual(estimateKumamotoResidentTax(3_600_000, 0, 0), {
    annual: 125_000,
    monthly: 10_417,
  });
  assert.deepEqual(estimateKumamotoResidentTax(3_600_000, 0, 1), {
    annual: 89_500,
    monthly: 7_458,
  });
  assert.deepEqual(estimateKumamotoResidentTax(3_600_000, 600_000, 0), {
    annual: 65_000,
    monthly: 5_417,
  });
});

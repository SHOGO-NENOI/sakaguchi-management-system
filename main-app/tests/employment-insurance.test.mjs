import test from "node:test";
import assert from "node:assert/strict";
import { estimateEmploymentInsurance } from "../app/lib/employment-insurance.ts";

test("令和8年度の一般事業の労働者負担率0.5％で計算する", () => {
  assert.equal(estimateEmploymentInsurance(255_940, "general"), 1_280);
});

test("建設・農林水産等は労働者負担率0.6％で計算する", () => {
  assert.equal(estimateEmploymentInsurance(255_940, "special"), 1_536);
});

test("給与から控除する際の50銭以下を切り捨てる", () => {
  assert.equal(estimateEmploymentInsurance(100, "general"), 0);
  assert.equal(estimateEmploymentInsurance(101, "general"), 1);
});

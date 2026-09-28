function salaryIncomeFromAnnualPay(annualSalary: number) {
  const salary = Math.max(0, Math.floor(annualSalary));
  if (salary <= 650_999) return 0;
  if (salary <= 1_899_999) return salary - 650_000;

  const quarterRoundedDown = Math.floor(salary / 4_000) * 1_000;
  if (salary <= 3_599_999) return quarterRoundedDown * 2.8 - 80_000;
  if (salary <= 6_599_999) return salary - 1_950_000;
  if (salary <= 8_499_999) return quarterRoundedDown * 3.2 - 440_000;
  return salary * 0.9 - 1_100_000;
}

function adjustmentDeduction(taxableIncome: number, dependentCount: number) {
  const personalDeductionDifference = 50_000 * (1 + dependentCount);
  if (taxableIncome <= 2_000_000) {
    return Math.min(personalDeductionDifference, taxableIncome) * 0.05;
  }
  return Math.max(
    (personalDeductionDifference - (taxableIncome - 2_000_000)) * 0.05,
    2_500,
  );
}

// 熊本市の令和8年度以降の給与所得計算表と、市民税8%・県民税2%、
// 均等割等5,500円を用いた概算。一般扶養控除と社会保険料控除を反映する。
export function estimateKumamotoResidentTax(
  annualSalary: number,
  annualSocialInsurance: number,
  dependentCount: number,
) {
  const salaryIncome = Math.max(0, salaryIncomeFromAnnualPay(annualSalary));
  const dependents = Math.max(0, Math.floor(dependentCount || 0));

  const fullExemptionThreshold = dependents > 0
    ? 315_000 * (1 + dependents) + 289_000
    : 415_000;
  if (salaryIncome <= fullExemptionThreshold) {
    return { annual: 0, monthly: 0 };
  }

  const incomeLevyExemptionThreshold = dependents > 0
    ? 350_000 * (1 + dependents) + 420_000
    : 450_000;
  const uniformLevy = 5_500;
  if (salaryIncome <= incomeLevyExemptionThreshold) {
    return { annual: uniformLevy, monthly: Math.round(uniformLevy / 12) };
  }

  const basicDeduction = 430_000;
  const generalDependentDeduction = 330_000 * dependents;
  const taxableIncome = Math.max(
    0,
    Math.floor(
      (salaryIncome -
        Math.max(0, annualSocialInsurance) -
        basicDeduction -
        generalDependentDeduction) /
        1_000,
    ) * 1_000,
  );
  const incomeLevy = Math.max(
    0,
    Math.floor(
      (taxableIncome * 0.1 - adjustmentDeduction(taxableIncome, dependents)) /
        100,
    ) * 100,
  );
  const annual = incomeLevy + uniformLevy;
  return { annual, monthly: Math.round(annual / 12) };
}

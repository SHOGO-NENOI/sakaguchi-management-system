function salaryIncomeDeduction(monthlyPayAfterSocialInsurance: number) {
  const amount = Math.max(0, monthlyPayAfterSocialInsurance);
  if (amount <= 158_333) return 54_167;
  if (amount <= 299_999) return Math.ceil(amount * 0.3 + 6_667);
  if (amount <= 549_999) return Math.ceil(amount * 0.2 + 36_667);
  if (amount <= 708_330) return Math.ceil(amount * 0.1 + 91_667);
  return 162_500;
}

function basicDeduction(monthlyPayAfterSocialInsurance: number) {
  const amount = Math.max(0, monthlyPayAfterSocialInsurance);
  if (amount <= 2_120_833) return 48_334;
  if (amount <= 2_162_499) return 40_000;
  if (amount <= 2_204_166) return 26_667;
  if (amount <= 2_245_833) return 13_334;
  return 0;
}

function taxBeforeRounding(taxableMonthlyIncome: number) {
  const amount = Math.max(0, taxableMonthlyIncome);
  if (amount <= 162_500) return amount * 0.05105;
  if (amount <= 275_000) return amount * 0.1021 - 8_296;
  if (amount <= 579_166) return amount * 0.2042 - 36_374;
  if (amount <= 750_000) return amount * 0.23483 - 54_113;
  if (amount <= 1_500_000) return amount * 0.33693 - 130_688;
  if (amount <= 3_333_333) return amount * 0.4084 - 237_893;
  return amount * 0.45945 - 408_061;
}

// 国税庁「令和8年分 月額表の甲欄を適用する給与等に対する
// 税額の電算機計算の特例」による所得税・復興特別所得税の概算。
export function estimateMonthlyIncomeTax(
  monthlyGrossPay: number,
  monthlySocialInsurance: number,
  dependentCount: number,
) {
  const afterSocialInsurance = Math.max(
    0,
    Math.round(monthlyGrossPay) - Math.round(monthlySocialInsurance),
  );
  const dependents = Math.max(0, Math.floor(dependentCount || 0));
  const taxableMonthlyIncome = Math.max(
    0,
    afterSocialInsurance -
      salaryIncomeDeduction(afterSocialInsurance) -
      31_667 * dependents -
      basicDeduction(afterSocialInsurance),
  );
  return Math.max(0, Math.round(taxBeforeRounding(taxableMonthlyIncome) / 10) * 10);
}

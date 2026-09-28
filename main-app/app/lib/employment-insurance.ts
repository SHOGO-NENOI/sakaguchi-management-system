export type EmploymentInsuranceCategory = "general" | "special";

export function estimateEmploymentInsurance(
  grossWages: number,
  category: EmploymentInsuranceCategory,
) {
  const rate = category === "special" ? 0.006 : 0.005;
  const rawPremium = Math.max(0, grossWages) * rate;
  // 給与から源泉控除する場合は、50銭以下を切り捨て、50銭超を切り上げる。
  return Math.max(0, Math.floor(rawPremium + 0.499999999));
}

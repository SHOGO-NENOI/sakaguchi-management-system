export type TripAllowanceBasis = "trip-day" | "hotel-night";

export function resolveOvertimePay(
  calculatedOvertimePay: number,
  fixedMonthlyAllowance: number,
  workedMonthCount: number,
) {
  const calculated = Math.max(0, Math.round(calculatedOvertimePay || 0));
  const fixed = Math.max(0, Math.round(fixedMonthlyAllowance || 0)) *
    Math.max(0, Math.floor(workedMonthCount || 0));
  return {
    amount: Math.max(calculated, fixed),
    fixedApplied: fixed > calculated,
  };
}

export function tripAllowanceUnits(
  basis: TripAllowanceBasis,
  tripDays: number,
  hotelNights: number,
) {
  return Math.max(
    0,
    Math.floor(basis === "hotel-night" ? hotelNights : tripDays),
  );
}

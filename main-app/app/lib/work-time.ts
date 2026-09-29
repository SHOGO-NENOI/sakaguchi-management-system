export type BreakWorkType = "1日" | "半日" | "休み";

export function breakMinutesForEntry(
  workType: BreakWorkType,
  workedMinutes: number,
  fullDayBreakMinutes: number,
  halfDayBreakMinutes: number,
) {
  const configured = workType === "1日"
    ? fullDayBreakMinutes
    : workType === "半日"
      ? halfDayBreakMinutes
      : 0;
  return Math.min(
    Math.max(0, Math.floor(workedMinutes)),
    Math.max(0, Math.floor(configured || 0)),
  );
}

export function netWorkMinutes(
  workType: BreakWorkType,
  workedMinutes: number,
  fullDayBreakMinutes: number,
  halfDayBreakMinutes: number,
) {
  return Math.max(
    0,
    workedMinutes -
      breakMinutesForEntry(
        workType,
        workedMinutes,
        fullDayBreakMinutes,
        halfDayBreakMinutes,
      ),
  );
}

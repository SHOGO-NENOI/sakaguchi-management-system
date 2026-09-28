type WeeklyWorkRecord = {
  week: string;
  workMinutes: number;
  earlyMinutes: number;
  dailyOvertimeMinutes: number;
};

export function calculateWeeklyOvertimeMinutes(records: WeeklyWorkRecord[]) {
  const weeklyNormalMinutes = new Map<string, number>();
  records.forEach((record) => {
    const normal = Math.max(
      0,
      record.workMinutes -
        record.earlyMinutes -
        record.dailyOvertimeMinutes,
    );
    weeklyNormalMinutes.set(
      record.week,
      (weeklyNormalMinutes.get(record.week) ?? 0) + normal,
    );
  });
  let total = 0;
  weeklyNormalMinutes.forEach((minutes) => {
    total += Math.max(0, minutes - 40 * 60);
  });
  return total;
}

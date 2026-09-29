type WeeklyWorkRecord = {
  week: string;
  workMinutes: number;
};

export function endOfWeekSaturday(week: string) {
  const date = new Date(`${week}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

export function calculateWeeklyOvertimeMinutes(
  records: WeeklyWorkRecord[],
  currentDate: string,
) {
  const weeklyWorkMinutes = new Map<string, number>();
  records.forEach((record) => {
    weeklyWorkMinutes.set(
      record.week,
      (weeklyWorkMinutes.get(record.week) ?? 0) + Math.max(0, record.workMinutes),
    );
  });
  let total = 0;
  weeklyWorkMinutes.forEach((minutes, week) => {
    // 土曜日当日はまだ勤務中の可能性があるため、翌日以降に確定する。
    if (endOfWeekSaturday(week) >= currentDate) return;
    total += Math.max(0, minutes - 40 * 60);
  });
  return total;
}

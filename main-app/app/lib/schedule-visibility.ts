export function isBeforeCurrentDate(date: string, currentDate: string) {
  return date < currentDate;
}

export function isCurrentUsersPlan(
  personnelValues: string[],
  currentUserName: string,
) {
  const names = personnelValues.flatMap((value) =>
    value
      .split(/[、,，]/)
      .map((name) => name.trim())
      .filter(Boolean),
  );
  return names.length === 0 || names.includes(currentUserName);
}

export function isPlanEnded(
  planDate: string,
  endTimes: string[],
  currentDate: string,
  currentTime: string,
) {
  if (planDate < currentDate) return true;
  if (planDate > currentDate) return false;
  const latestEnd = endTimes
    .map((value) => value.trim())
    .filter((value) => /^\d{2}:\d{2}$/.test(value))
    .sort()
    .at(-1);
  return Boolean(latestEnd && currentTime >= latestEnd);
}

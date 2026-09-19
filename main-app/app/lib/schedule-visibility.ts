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

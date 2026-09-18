export function groupRecordsByDate<T extends { date: string }>(entries: T[]) {
  const groups: { date: string; entries: T[] }[] = [];
  for (const entry of entries) {
    const group = groups[groups.length - 1];
    if (group?.date === entry.date) group.entries.push(entry);
    else groups.push({ date: entry.date, entries: [entry] });
  }
  return groups;
}

export function splitUpcomingRecords<T extends { date: string }>(
  entries: T[],
  today: string,
  tomorrow: string,
) {
  return {
    today: entries.filter((entry) => entry.date === today),
    tomorrow: entries.filter((entry) => entry.date === tomorrow),
    later: entries.filter((entry) => entry.date > tomorrow),
  };
}

export function groupRecordsByDate<T extends { date: string }>(entries: T[]) {
  const groups: { date: string; entries: T[] }[] = [];
  for (const entry of entries) {
    const group = groups[groups.length - 1];
    if (group?.date === entry.date) group.entries.push(entry);
    else groups.push({ date: entry.date, entries: [entry] });
  }
  return groups;
}

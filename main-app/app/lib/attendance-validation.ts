import { SITE_SEPARATOR, splitNames, toMinutes } from "./entry-helpers";
import type { Entry } from "../types";

export function attendanceWarnings(form: Omit<Entry, "id">, entries: Entry[], editingId: string | null) {
  const warnings = new Set<string>();
  if (!form.date) warnings.add("日付が未入力です");
  if (form.type === "休み") return [...warnings];
  const sites = form.site.split(SITE_SEPARATOR);
  const locations = form.location.split(SITE_SEPARATOR);
  const addresses = form.address.split(SITE_SEPARATOR);
  const coordinates = form.coordinates.split(SITE_SEPARATOR);
  const people = form.personnelNames.split(SITE_SEPARATOR);
  const works = form.work.split(SITE_SEPARATOR);
  const starts = form.start.split(SITE_SEPARATOR);
  const ends = form.end.split(SITE_SEPARATOR);
  const count = Math.max(sites.length, locations.length, people.length, works.length, starts.length, ends.length, 1);
  for (let index = 0; index < count; index += 1) {
    const label = sites[index]?.trim() || `現場${index + 1}`;
    if (!locations[index]?.trim()) warnings.add(`${label}の場所が未入力です`);
    if (!sites[index]?.trim()) warnings.add(`${label}の現場名が未入力です`);
    if (!people[index]?.trim()) warnings.add(`${label}の作業者が未入力です`);
    if (!works[index]?.trim()) warnings.add(`${label}の作業内容が未入力です`);
    if (!addresses[index]?.trim() && !coordinates[index]?.trim()) warnings.add(`${label}の住所・座標が未入力です`);
    if (!starts[index] || !ends[index] || toMinutes(ends[index]) <= toMinutes(starts[index])) warnings.add(`${label}の開始・終了時刻を確認してください`);
    const selectedPeople = splitNames(people[index] || "");
    entries.filter((entry) => entry.id !== editingId && entry.date === form.date && entry.type !== "休み").forEach((entry) => {
      const entrySites = entry.site.split(SITE_SEPARATOR);
      const entryPeople = entry.personnelNames.split(SITE_SEPARATOR);
      const entryStarts = entry.start.split(SITE_SEPARATOR);
      const entryEnds = entry.end.split(SITE_SEPARATOR);
      const rowCount = Math.max(entrySites.length, entryPeople.length, entryStarts.length, entryEnds.length, 1);
      for (let row = 0; row < rowCount; row += 1) {
        const overlaps = Boolean(starts[index] && ends[index] && entryStarts[row] && entryEnds[row]) && toMinutes(starts[index]) < toMinutes(entryEnds[row]) && toMinutes(entryStarts[row]) < toMinutes(ends[index]);
        if (!overlaps) continue;
        const shared = selectedPeople.filter((name) => splitNames(entryPeople[row] || "").includes(name));
        if (shared.length) warnings.add(`${shared.join("・")}の予定時間が既存予定と重複しています`);
        if (sites[index]?.trim() && entrySites[row]?.trim() === sites[index].trim()) warnings.add(`${label}は同じ時間帯に既存予定があります`);
      }
    });
  }
  return [...warnings];
}

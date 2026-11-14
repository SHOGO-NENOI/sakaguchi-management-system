import type { Entry } from "@/app/types";

const normalizeSearchText = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");

export function matchesEntrySearch(entry: Entry, query: string) {
  const terms = query
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/\s+/)
    .map(normalizeSearchText)
    .filter(Boolean);
  if (!terms.length) return true;

  const dateParts = entry.date.split("-");
  const searchable = normalizeSearchText(
    [
      entry.date,
      dateParts.length === 3 ? `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}` : "",
      dateParts.length === 3 ? `${dateParts[0]}年${Number(dateParts[1])}月${Number(dateParts[2])}日` : "",
      entry.type,
      entry.site,
      entry.location,
      entry.address,
      entry.coordinates,
      entry.personnelNames,
      entry.work,
      entry.note,
      entry.weather,
      entry.workMode,
      entry.dinnerType,
      entry.hotelName,
    ].join("\n"),
  );
  return terms.every((term) => searchable.includes(term));
}

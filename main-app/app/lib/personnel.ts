const PERSONNEL_ALIASES = new Map([
  ["大貴くん", "清田"],
  ["あっくん", "坂口"],
]);

function personnelKey(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, "").toLocaleLowerCase();
}

export function canonicalPersonnelName(value: string) {
  const trimmed = value.trim();
  return PERSONNEL_ALIASES.get(personnelKey(trimmed)) ?? trimmed;
}

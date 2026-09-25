import { coordinateKey } from "@/app/lib/coordinates";
import type { Entry, RegionInfo, SiteCardData } from "@/app/types";

export const SITE_SEPARATOR = "｜";

export function splitSites(value: string) {
  return value
    .split(SITE_SEPARATOR)
    .map((site) => site.trim())
    .filter(Boolean);
}

export function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return dateKey(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
  );
}

export function nthMonday(year: number, month: number, nth: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((8 - firstWeekday) % 7) + (nth - 1) * 7;
}

// 日曜始まりの週の起点日を返す（週40時間の判定に使用）。
export function startOfWeekSunday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(date, -weekday);
}

export function japaneseHolidays(year: number) {
  const holidays = new Map<string, string>();
  const add = (month: number, day: number, name: string) =>
    holidays.set(dateKey(year, month, day), name);
  add(1, 1, "元日");
  add(1, nthMonday(year, 1, 2), "成人の日");
  add(2, 11, "建国記念の日");
  if (year >= 2020) add(2, 23, "天皇誕生日");
  add(
    3,
    Math.floor(
      20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
    ),
    "春分の日",
  );
  add(4, 29, "昭和の日");
  add(5, 3, "憲法記念日");
  add(5, 4, "みどりの日");
  add(5, 5, "こどもの日");
  if (year === 2020) add(7, 23, "海の日");
  else if (year === 2021) add(7, 22, "海の日");
  else add(7, nthMonday(year, 7, 3), "海の日");
  if (year === 2020) add(8, 10, "山の日");
  else if (year === 2021) add(8, 8, "山の日");
  else add(8, 11, "山の日");
  add(9, nthMonday(year, 9, 3), "敬老の日");
  add(
    9,
    Math.floor(
      23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
    ),
    "秋分の日",
  );
  if (year === 2020) add(7, 24, "スポーツの日");
  else if (year === 2021) add(7, 23, "スポーツの日");
  else add(10, nthMonday(year, 10, 2), "スポーツの日");
  add(11, 3, "文化の日");
  add(11, 23, "勤労感謝の日");

  for (let month = 1; month <= 12; month += 1) {
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 2; day < days; day += 1) {
      const current = dateKey(year, month, day);
      if (
        !holidays.has(current) &&
        holidays.has(addDays(current, -1)) &&
        holidays.has(addDays(current, 1))
      )
        holidays.set(current, "国民の休日");
    }
  }
  [...holidays.keys()].sort().forEach((holiday) => {
    const [holidayYear, holidayMonth, holidayDay] = holiday
      .split("-")
      .map(Number);
    if (
      new Date(
        Date.UTC(holidayYear, holidayMonth - 1, holidayDay),
      ).getUTCDay() !== 0
    )
      return;
    let substitute = addDays(holiday, 1);
    while (holidays.has(substitute)) substitute = addDays(substitute, 1);
    holidays.set(substitute, "振替休日");
  });
  return holidays;
}

export function entrySiteRows(
  entry: Pick<
    Entry,
    | "site"
    | "location"
    | "address"
    | "coordinates"
    | "personnelNames"
    | "work"
    | "note"
  >,
) {
  const sites = entry.site ? entry.site.split(SITE_SEPARATOR) : [];
  const locations = entry.location ? entry.location.split(SITE_SEPARATOR) : [];
  const addresses = entry.address ? entry.address.split(SITE_SEPARATOR) : [];
  const coordinates = entry.coordinates
    ? entry.coordinates.split(SITE_SEPARATOR)
    : [];
  const personnel = entry.personnelNames
    ? entry.personnelNames.split(SITE_SEPARATOR)
    : [];
  const works = entry.work ? entry.work.split(SITE_SEPARATOR) : [];
  const notes = entry.note ? entry.note.split(SITE_SEPARATOR) : [];
  return Array.from(
    {
      length: Math.max(
        sites.length,
        locations.length,
        addresses.length,
        coordinates.length,
        personnel.length,
        works.length,
        notes.length,
      ),
    },
    (_, index) => ({
      site: sites[index]?.trim() ?? "",
      location: locations[index]?.trim() ?? "",
      address: addresses[index]?.trim() ?? "",
      coordinates: coordinates[index]?.trim() ?? "",
      personnelNames: personnel[index]?.trim() ?? "",
      work: works[index]?.trim() ?? "",
      note: notes[index]?.trim() ?? "",
    }),
  ).filter(
    (row) =>
      row.site ||
      row.location ||
      row.address ||
      row.coordinates ||
      row.personnelNames ||
      row.work ||
      row.note,
  );
}

export function indexedEntrySiteRows(
  entry: Pick<
    Entry,
    | "site"
    | "location"
    | "address"
    | "coordinates"
    | "personnelNames"
    | "work"
    | "note"
  >,
) {
  const sites = entry.site ? entry.site.split(SITE_SEPARATOR) : [];
  const locations = entry.location ? entry.location.split(SITE_SEPARATOR) : [];
  const addresses = entry.address ? entry.address.split(SITE_SEPARATOR) : [];
  const coordinates = entry.coordinates
    ? entry.coordinates.split(SITE_SEPARATOR)
    : [];
  const personnel = entry.personnelNames
    ? entry.personnelNames.split(SITE_SEPARATOR)
    : [];
  const works = entry.work ? entry.work.split(SITE_SEPARATOR) : [];
  const notes = entry.note ? entry.note.split(SITE_SEPARATOR) : [];
  return Array.from(
    {
      length: Math.max(
        sites.length,
        locations.length,
        addresses.length,
        coordinates.length,
        personnel.length,
        works.length,
        notes.length,
        1,
      ),
    },
    (_, index) => ({
      index,
      site: sites[index]?.trim() ?? "",
      location: locations[index]?.trim() ?? "",
      address: addresses[index]?.trim() ?? "",
      coordinates: coordinates[index]?.trim() ?? "",
    }),
  );
}

export function siteCardKey(
  card: Pick<SiteCardData, "site" | "location" | "address" | "coordinates">,
) {
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().replace(/\s+/g, "").toLocaleLowerCase();
  const site = normalize(card.site);
  if (site) return `site:${site}`;
  const address = normalize(card.address);
  if (address) return `address:${address}`;
  const coordinates = normalize(card.coordinates);
  if (coordinates) return `coordinates:${coordinates}`;
  return `location:${normalize(card.location)}`;
}

export const PREFECTURE_REGIONS = [
  "北海道",
  "青森",
  "岩手",
  "宮城",
  "秋田",
  "山形",
  "福島",
  "茨城",
  "栃木",
  "群馬",
  "埼玉",
  "千葉",
  "東京",
  "神奈川",
  "新潟",
  "富山",
  "石川",
  "福井",
  "山梨",
  "長野",
  "岐阜",
  "静岡",
  "愛知",
  "三重",
  "滋賀",
  "京都",
  "大阪",
  "兵庫",
  "奈良",
  "和歌山",
  "鳥取",
  "島根",
  "岡山",
  "広島",
  "山口",
  "徳島",
  "香川",
  "愛媛",
  "高知",
  "福岡",
  "佐賀",
  "長崎",
  "熊本",
  "大分",
  "宮崎",
  "鹿児島",
  "沖縄",
];

export function prefectureFullName(name: string) {
  if (name === "北海道") return name;
  if (name === "東京") return "東京都";
  if (["京都", "大阪"].includes(name)) return `${name}府`;
  return `${name}県`;
}

export function parseJapaneseRegion(value: string): RegionInfo | null {
  const normalized = value
    .normalize("NFKC")
    .replace(/〒?\d{3}-?\d{4}/g, "")
    .trim();
  if (!normalized) return null;
  const exactPrefecture = PREFECTURE_REGIONS.map((name) => ({
    base: name,
    full: prefectureFullName(name),
  })).find(({ full }) => normalized.includes(full));
  const prefectureBase =
    exactPrefecture?.base ??
    PREFECTURE_REGIONS.find((name) => normalized.startsWith(name));
  if (!prefectureBase) return null;
  const prefecture =
    exactPrefecture?.full ?? prefectureFullName(prefectureBase);
  const fullIndex = normalized.indexOf(prefecture);
  const remainder =
    fullIndex >= 0
      ? normalized.slice(fullIndex + prefecture.length).trim()
      : normalized.slice(normalized.indexOf(prefectureBase)).trim();
  const matchedMunicipality =
    remainder.match(/^(.+?市.+?区)/)?.[1] ??
    remainder.match(/^(.+?郡.+?[町村])/)?.[1] ??
    remainder.match(/^(.+?市)/)?.[1] ??
    remainder.match(/^(.+?区)/)?.[1] ??
    remainder.match(/^(.+?[町村])/)?.[1];
  const looseArea =
    remainder
      .replace(new RegExp(`^${prefectureBase}[都道府県]?`), "")
      .replace(/^[　\s／/・、,]+/, "")
      .split(/[　\s／/・、,]+/)[0] ?? "";
  const designatedCities = new Set([
    "札幌",
    "仙台",
    "さいたま",
    "千葉",
    "横浜",
    "川崎",
    "相模原",
    "新潟",
    "静岡",
    "浜松",
    "名古屋",
    "京都",
    "大阪",
    "堺",
    "神戸",
    "岡山",
    "広島",
    "北九州",
    "福岡",
    "熊本",
  ]);
  const municipality =
    (matchedMunicipality ??
      (designatedCities.has(looseArea) ? `${looseArea}市` : looseArea)) ||
    "市区町村未設定";
  return { prefecture, municipality: municipality.replace(/[　\s]+/g, "") };
}

export function cardRegionInfo(
  card: SiteCardData,
  coordinateRegions: Record<string, RegionInfo>,
): RegionInfo {
  const fromAddress = parseJapaneseRegion(card.address);
  if (fromAddress && fromAddress.municipality !== "市区町村未設定")
    return fromAddress;
  const fromCoordinates = coordinateRegions[coordinateKey(card.coordinates)];
  if (fromCoordinates) return fromCoordinates;
  if (fromAddress) return fromAddress;
  const fromLocation = parseJapaneseRegion(card.location);
  if (fromLocation) return fromLocation;
  return {
    prefecture: "都道府県未設定",
    municipality: card.location.trim() || "市区町村未設定",
  };
}

export function elapsedDays(recentDate: string, olderDate: string) {
  return Math.round(
    (Date.parse(`${recentDate}T00:00:00Z`) -
      Date.parse(`${olderDate}T00:00:00Z`)) /
      86400000,
  );
}

export function mapsUrl(
  address: string,
  coordinates: string,
  location = "",
  site = "",
) {
  const query =
    coordinates.trim() ||
    address.trim() ||
    [location, site].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function navigationUrl(address: string, coordinates: string) {
  const destination = coordinates.trim() || address.trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate`;
}

export const COORDINATE_PAIR_PATTERN =
  /[-+]?\d{1,2}(?:\.\d+)?\s*[,，]\s*[-+]?\d{1,3}(?:\.\d+)?/;

export function positionInputValue(address: string, coordinates: string) {
  return [address.trim(), coordinates.trim()].filter(Boolean).join(" ／ ");
}

export function parsePositionInput(value: string) {
  const coordinateMatch = value.match(COORDINATE_PAIR_PATTERN);
  const coordinates = coordinateMatch?.[0].replace("，", ",") ?? "";
  const address = coordinateMatch
    ? value
        .replace(coordinateMatch[0], "")
        .replace(/^[\s／/|｜・]+|[\s／/|｜・]+$/g, "")
    : value.trim();
  return { address, coordinates };
}

export async function addressFromCoordinates(coordinates: string) {
  const key = coordinateKey(coordinates);
  if (!key) return "";
  try {
    const response = await fetch("/api/regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: [coordinates] }),
    });
    if (!response.ok) return "";
    const data = (await response.json()) as {
      addresses?: Record<string, string>;
    };
    return data.addresses?.[key] ?? "";
  } catch {
    return "";
  }
}

export function displaySiteDetails(
  siteValue: string,
  locationValue: string,
  personnelValue = "",
  addressValue = "",
  coordinatesValue = "",
  workValue = "",
  noteValue = "",
) {
  const sites = siteValue ? siteValue.split(SITE_SEPARATOR) : [];
  const locations = locationValue ? locationValue.split(SITE_SEPARATOR) : [];
  const addresses = addressValue ? addressValue.split(SITE_SEPARATOR) : [];
  const coordinates = coordinatesValue
    ? coordinatesValue.split(SITE_SEPARATOR)
    : [];
  const personnel = personnelValue ? personnelValue.split(SITE_SEPARATOR) : [];
  const works = workValue ? workValue.split(SITE_SEPARATOR) : [];
  const notes = noteValue ? noteValue.split(SITE_SEPARATOR) : [];
  return Array.from(
    {
      length: Math.max(
        sites.length,
        locations.length,
        addresses.length,
        coordinates.length,
        personnel.length,
        works.length,
        notes.length,
      ),
    },
    (_, index) => {
      const place =
        [locations[index]?.trim(), sites[index]?.trim()]
          .filter(Boolean)
          .join("／") ||
        addresses[index]?.trim() ||
        coordinates[index]?.trim();
      const names = personnel[index]?.trim();
      const work = works[index]?.trim();
      const note = notes[index]?.trim();
      const base = names ? `${place || "現場名なし"}（${names}）` : place;
      const detail = work ? `${base || "現場名なし"}【${work}】` : base;
      return note ? `${detail || "現場名なし"} — メモ：${note}` : detail;
    },
  )
    .filter(Boolean)
    .join("・");
}

export function displayWorkSegments(locationValue: string, siteValue: string, workValue: string) {
  const locations = locationValue ? locationValue.split(SITE_SEPARATOR) : [];
  const sites = siteValue ? siteValue.split(SITE_SEPARATOR) : [];
  const works = workValue ? workValue.split(SITE_SEPARATOR) : [];
  return Array.from(
    { length: Math.max(locations.length, sites.length, works.length) },
    (_, index) => {
      const location = locations[index]?.trim() || "場所未入力";
      const site = sites[index]?.trim() || "現場名なし";
      const work = (works[index]?.trim() || "作業内容なし").replace(/[、,，／/]+/g, "・");
      return `【${location}】${site}(${work})`;
    },
  );
}

export function displayWorkSummary(locationValue: string, siteValue: string, workValue: string) {
  return displayWorkSegments(locationValue, siteValue, workValue).join(" → ");
}

export function splitNames(value: string) {
  return value
    .split(/[、,，\s]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

// 通信・JSON解析など技術的な例外文をそのまま画面に出さないための変換。
// 意図的に投げた日本語メッセージだけを表示し、それ以外はfallbackへ差し替える。
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && /[぀-ヿ一-龯]/.test(error.message)) {
    return error.message;
  }
  return fallback;
}

export const today = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
};

export function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export const emptyEntry = (): Omit<Entry, "id"> => ({
  date: today(),
  type: "1日",
  start: "08:00",
  end: "17:00",
  site: "",
  location: "",
  address: "",
  coordinates: "",
  personnelNames: "",
  work: "",
  note: "",
  businessTrip: false,
  dinnerType: "",
  hotelName: "",
  googleEventId: "",
  deletedAt: "",
  syncStatus: "pending",
  syncError: "",
  lastSyncedAt: "",
  lastModifiedSource: "app",
  updatedAt: "",
});

export function toMinutes(value: string) {
  if (!value) return 0;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function extraMinutes(entry: Entry | Omit<Entry, "id">) {
  if (!entry.start || !entry.end || !["1日", "半日"].includes(entry.type))
    return { early: 0, overtime: 0 };
  const starts = entry.start
    .split(SITE_SEPARATOR)
    .filter(Boolean)
    .map(toMinutes);
  const ends = entry.end.split(SITE_SEPARATOR).filter(Boolean).map(toMinutes);
  const start = starts.length ? Math.min(...starts) : 0;
  const end = ends.length ? Math.max(...ends) : 0;
  return {
    early: Math.floor(Math.max(0, 8 * 60 - start) / 30) * 30,
    overtime: Math.floor(Math.max(0, end - 17 * 60) / 30) * 30,
  };
}

export function workMinutes(entry: Entry | Omit<Entry, "id">) {
  if (!["1日", "半日"].includes(entry.type)) return 0;
  const starts = entry.start.split(SITE_SEPARATOR);
  const ends = entry.end.split(SITE_SEPARATOR);
  return Array.from(
    { length: Math.max(starts.length, ends.length) },
    (_, index) => {
      const start = starts[index];
      const end = ends[index];
      if (!start || !end) return 0;
      return Math.max(0, toMinutes(end) - toMinutes(start));
    },
  ).reduce((total, minutes) => total + minutes, 0);
}

export function formatEntryTimes(entry: Pick<Entry, "start" | "end">) {
  const starts = entry.start.split(SITE_SEPARATOR);
  const ends = entry.end.split(SITE_SEPARATOR);
  return Array.from(
    { length: Math.max(starts.length, ends.length) },
    (_, index) => [starts[index], ends[index]].filter(Boolean).join("–"),
  )
    .filter(Boolean)
    .join("・");
}

export function shiftBoardRange(entry: Pick<Entry, "start" | "end">) {
  const starts = entry.start.split(SITE_SEPARATOR).filter(Boolean);
  const ends = entry.end.split(SITE_SEPARATOR).filter(Boolean);
  if (!starts.length || !ends.length) return { start: "", end: "" };
  return {
    start: starts.reduce((earliest, value) =>
      toMinutes(value) < toMinutes(earliest) ? value : earliest,
    ),
    end: ends.reduce((latest, value) =>
      toMinutes(value) > toMinutes(latest) ? value : latest,
    ),
  };
}

export function shiftBoardFingerprint(entry: Entry) {
  const range = shiftBoardRange(entry);
  return `${entry.id}:${entry.date}:${entry.type}:${range.start}:${range.end}`;
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}分`;
  return m ? `${h}時間${m}分` : `${h}時間`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`));
}

export function fullDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    weekday: "long",
  }).format(new Date(`${value}T00:00:00+09:00`));
  return `${year}/${month}/${day}(${weekday})`;
}

export function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

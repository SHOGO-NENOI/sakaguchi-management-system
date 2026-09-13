"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { coordinateKey } from "@/app/lib/coordinates";

type WorkType = "1日" | "半日" | "休み";
type Entry = {
  id: string;
  date: string;
  type: WorkType;
  start: string;
  end: string;
  site: string;
  location: string;
  address: string;
  coordinates: string;
  personnelNames: string;
  work: string;
  note: string;
  businessTrip: boolean;
  dinnerType: string;
  hotelName: string;
  googleEventId: string;
  deletedAt: string;
  syncStatus: string;
  syncError: string;
  lastSyncedAt: string;
  lastModifiedSource: string;
};

type CalendarSettings = {
  webhookUrl: string;
  syncKey: string;
  enabled: boolean;
};
type GoogleConnection = {
  configured: boolean;
  connected: boolean;
  email: string;
  name: string;
  clientId: string;
  spreadsheetUrl: string;
};
type PaySettings = {
  dailyRate: string;
  standardHours: string;
  overtimeMultiplier: string;
};
type SiteCardData = {
  masterId?: number;
  site: string;
  location: string;
  address: string;
  coordinates: string;
  visits: number;
  workDays: number;
  tripCount: number;
  lastDate: string;
  works: Set<string>;
  people: Set<string>;
  notes: { date: string; note: string }[];
};
type SiteMaster = {
  id: number;
  site: string;
  location: string;
  address: string;
  coordinates: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string;
};
type MasterOption = {
  id: number;
  type: "work" | "person";
  name: string;
  sortOrder: number;
  archivedAt: string;
};
type RegionInfo = { prefecture: string; municipality: string };
type ToolCategory = "通常業務" | "出張";
type ToolChecklistItem = {
  id: number;
  setId: number;
  name: string;
  sortOrder: number;
  checked: boolean;
};
type ToolChecklistSet = {
  id: number;
  category: ToolCategory;
  name: string;
  sortOrder: number;
  items: ToolChecklistItem[];
};
type SiteDocument = {
  id: number;
  siteKey: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};
type ToolDragState = {
  type: "set" | "item";
  setId: number;
  id: number;
  pointerId: number;
  lastY: number;
  active: boolean;
  timer: number;
};
type Skin = "green" | "black" | "blue" | "purple" | "brown";
type FontSize = "small" | "standard" | "large";
type AppTab =
  | "entry"
  | "history"
  | "plans"
  | "summary"
  | "sites"
  | "tools"
  | "shiftboard"
  | "settings";
type SummaryPeriod = "monthly" | "annual";
type SyncDashboard = {
  synced: number;
  pending: number;
  errors: { id: number; date: string; site: string; error: string }[];
  duplicates: {
    keepEventId: string;
    duplicateEventIds: string[];
    summary: string;
    start: string;
  }[];
  trash: {
    id: number;
    date: string;
    site: string;
    deletedAt: string;
    source: string;
  }[];
  lastSyncAt: string;
};

const APP_VERSION = "2.2.24";
const APP_UPDATED_AT = "2026年9月13日";
const defaultPaySettings: PaySettings = {
  dailyRate: "",
  standardHours: "8",
  overtimeMultiplier: "1.25",
};

const workTypes: WorkType[] = ["1日", "半日", "休み"];
const FIXED_WORK_OPTIONS = [
  "剪定",
  "伐採",
  "草刈り",
  "抜根",
  "消毒",
  "除草剤",
  "その他",
];
const GARBAGE_DISPOSAL_TRIGGERS = ["剪定", "伐採", "草刈り", "抜根", "その他"];
const GARBAGE_DISPOSAL_OPTION = "ゴミ処分";
const SITE_SEPARATOR = "｜";

function splitSites(value: string) {
  return value
    .split(SITE_SEPARATOR)
    .map((site) => site.trim())
    .filter(Boolean);
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return dateKey(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
  );
}

function nthMonday(year: number, month: number, nth: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((8 - firstWeekday) % 7) + (nth - 1) * 7;
}

function japaneseHolidays(year: number) {
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

function entrySiteRows(
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

function indexedEntrySiteRows(
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

function siteCardKey(
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

const PREFECTURE_REGIONS = [
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

function prefectureFullName(name: string) {
  if (name === "北海道") return name;
  if (name === "東京") return "東京都";
  if (["京都", "大阪"].includes(name)) return `${name}府`;
  return `${name}県`;
}

function parseJapaneseRegion(value: string): RegionInfo | null {
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

function cardRegionInfo(
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

function elapsedDays(recentDate: string, olderDate: string) {
  return Math.round(
    (Date.parse(`${recentDate}T00:00:00Z`) -
      Date.parse(`${olderDate}T00:00:00Z`)) /
      86400000,
  );
}

function mapsUrl(
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

function navigationUrl(address: string, coordinates: string) {
  const destination = coordinates.trim() || address.trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate`;
}

const COORDINATE_PAIR_PATTERN =
  /[-+]?\d{1,2}(?:\.\d+)?\s*[,，]\s*[-+]?\d{1,3}(?:\.\d+)?/;

function positionInputValue(address: string, coordinates: string) {
  return [address.trim(), coordinates.trim()].filter(Boolean).join(" ／ ");
}

function parsePositionInput(value: string) {
  const coordinateMatch = value.match(COORDINATE_PAIR_PATTERN);
  const coordinates = coordinateMatch?.[0].replace("，", ",") ?? "";
  const address = coordinateMatch
    ? value
        .replace(coordinateMatch[0], "")
        .replace(/^[\s／/|｜・]+|[\s／/|｜・]+$/g, "")
    : value.trim();
  return { address, coordinates };
}

async function addressFromCoordinates(coordinates: string) {
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

function displaySiteDetails(
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

function displayWorkSegments(locationValue: string, siteValue: string, workValue: string) {
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

function displayWorkSummary(locationValue: string, siteValue: string, workValue: string) {
  return displayWorkSegments(locationValue, siteValue, workValue).join(" → ");
}

function splitNames(value: string) {
  return value
    .split(/[、,，\s]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

const today = () => {
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

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

const emptyEntry = (): Omit<Entry, "id"> => ({
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
});

function appsScriptCode(syncKey: string) {
  return `const SYNC_KEY = ${JSON.stringify(syncKey)};
const SPREADSHEET_NAME = "坂口商会勤怠記録データ";
const SHEET_NAME = "勤務記録";
const HEADERS = ["記録ID", "日付", "勤務区分", "出勤時刻", "退勤時刻", "場所", "現場名", "住所", "緯度・経度", "作業者", "作業内容", "メモ", "出張", "夜ご飯", "更新日時", "記録状態", "宿泊ホテル"];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.key !== SYNC_KEY) throw new Error("連携キーが違います");
    const spreadsheet = getAttendanceSpreadsheet();
    const sheet = getAttendanceSheet(spreadsheet);
    syncSheetRow(sheet, data);
    const calendar = CalendarApp.getDefaultCalendar();
    if (data.eventId) {
      const oldEvent = calendar.getEventById(data.eventId);
      if (oldEvent) oldEvent.deleteEvent();
    }
    if (data.calendarAction === "delete") return json({ ok: true, eventId: "", spreadsheetUrl: spreadsheet.getUrl() });
    let event;
    if (data.allDay) {
      const startDate = new Date(data.date + "T00:00:00+09:00");
      const endDate = new Date((data.endDate || data.date) + "T00:00:00+09:00");
      endDate.setDate(endDate.getDate() + 1);
      event = calendar.createAllDayEvent(data.title, startDate, endDate, { description: data.description });
    } else {
      const start = new Date(data.date + "T" + data.start + ":00+09:00");
      const end = new Date(data.date + "T" + data.end + ":00+09:00");
      event = calendar.createEvent(data.title, start, end, { description: data.description });
    }
    event.setColor(String(data.color));
    return json({ ok: true, eventId: event.getId(), spreadsheetUrl: spreadsheet.getUrl() });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) });
  }
}

function getAttendanceSpreadsheet() {
  const properties = PropertiesService.getUserProperties();
  const savedId = properties.getProperty("ATTENDANCE_SPREADSHEET_ID");
  if (savedId) {
    try { return SpreadsheetApp.openById(savedId); } catch (error) { properties.deleteProperty("ATTENDANCE_SPREADSHEET_ID"); }
  }
  const spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
  properties.setProperty("ATTENDANCE_SPREADSHEET_ID", spreadsheet.getId());
  return spreadsheet;
}

function getAttendanceSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold").setBackground("#dcefe8");
  return sheet;
}

function syncSheetRow(sheet, data) {
  const recordId = String(data.recordId || "");
  if (!recordId) throw new Error("記録IDがありません");
  const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat() : [];
  const foundIndex = ids.findIndex(function(id) { return String(id) === recordId; });
  const rowNumber = foundIndex >= 0 ? foundIndex + 2 : sheet.getLastRow() + 1;
  if (data.sheetAction === "delete") {
    if (foundIndex >= 0) sheet.deleteRow(rowNumber);
    return;
  }
  const row = [recordId, data.date, data.workType, data.start, data.end, data.location, data.site, data.address, data.coordinates, data.personnelNames, data.work, data.note, data.businessTrip ? "あり" : "なし", data.dinnerType, new Date(), data.recordStatus || "実績", data.hotelName || ""];
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  sheet.autoResizeColumns(1, HEADERS.length);
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}`;
}

function toMinutes(value: string) {
  if (!value) return 0;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function extraMinutes(entry: Entry | Omit<Entry, "id">) {
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

function workMinutes(entry: Entry | Omit<Entry, "id">) {
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

function formatEntryTimes(entry: Pick<Entry, "start" | "end">) {
  const starts = entry.start.split(SITE_SEPARATOR);
  const ends = entry.end.split(SITE_SEPARATOR);
  return Array.from(
    { length: Math.max(starts.length, ends.length) },
    (_, index) => [starts[index], ends[index]].filter(Boolean).join("–"),
  )
    .filter(Boolean)
    .join("・");
}

function shiftBoardRange(entry: Pick<Entry, "start" | "end">) {
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

function shiftBoardFingerprint(entry: Entry) {
  const range = shiftBoardRange(entry);
  return `${entry.id}:${entry.date}:${entry.type}:${range.start}:${range.end}`;
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}分`;
  return m ? `${h}時間${m}分` : `${h}時間`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function fullDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    weekday: "long",
  }).format(new Date(`${value}T00:00:00+09:00`));
  return `${year}/${month}/${day}(${weekday})`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(today);
  useEffect(() => {
    const refreshDate = () => setCurrentDate(today());
    const timer = window.setInterval(refreshDate, 30000);
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshDate);
      document.removeEventListener("visibilitychange", refreshDate);
    };
  }, []);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [siteMasters, setSiteMasters] = useState<SiteMaster[]>([]);
  const [form, setForm] = useState(emptyEntry());
  const [offEndDate, setOffEndDate] = useState(today());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("monthly");
  const [historyView, setHistoryView] = useState<"list" | "calendar">("list");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
    webhookUrl: "",
    syncKey: "",
    enabled: false,
  });
  const [showCalendarSetup, setShowCalendarSetup] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState("");
  const [googleConnection, setGoogleConnection] = useState<GoogleConnection>({
    configured: false,
    connected: false,
    email: "",
    name: "",
    clientId: "",
    spreadsheetUrl: "",
  });
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleConnectionMessage, setGoogleConnectionMessage] = useState("");
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [syncDashboard, setSyncDashboard] = useState<SyncDashboard | null>(
    null,
  );
  const [syncManagerMessage, setSyncManagerMessage] = useState("");
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<string[]>(
    [],
  );
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [notificationStatus, setNotificationStatus] = useState<
    "default" | "granted" | "denied" | "unsupported"
  >("default");
  const [activeTab, setActiveTab] = useState<AppTab>("entry");
  useEffect(() => {
    setSelectedPlanIds([]);
  }, [currentDate, month, activeTab]);
  const [skin, setSkin] = useState<Skin>("green");
  const [skinReady, setSkinReady] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>("standard");
  const [fontSizeReady, setFontSizeReady] = useState(false);
  const [shiftBoardDone, setShiftBoardDone] = useState<string[]>([]);
  const [paySettings, setPaySettings] =
    useState<PaySettings>(defaultPaySettings);
  const [bulkPlanning, setBulkPlanning] = useState(false);
  const [bulkPlanMessage, setBulkPlanMessage] = useState("");
  const [editingSiteLocationKey, setEditingSiteLocationKey] = useState<
    string | null
  >(null);
  const [siteLocationDraft, setSiteLocationDraft] = useState({
    location: "",
    address: "",
    coordinates: "",
  });
  const [siteLocationSaving, setSiteLocationSaving] = useState(false);
  const [siteLocationMessage, setSiteLocationMessage] = useState("");
  const [siteCardSearch, setSiteCardSearch] = useState("");
  const [siteCardSort, setSiteCardSort] = useState<"region" | "name" | "newest" | "oldest">("region");
  const [siteAddressFilter, setSiteAddressFilter] = useState<"all" | "registered" | "missing">("all");
  const [siteDocumentFilter, setSiteDocumentFilter] = useState<"all" | "has" | "none">("all");
  const [coordinateRegions, setCoordinateRegions] = useState<
    Record<string, RegionInfo>
  >({});
  const [coordinateAddresses, setCoordinateAddresses] = useState<
    Record<string, string>
  >({});
  const [locatingSiteIndex, setLocatingSiteIndex] = useState<number | null>(
    null,
  );
  const [locationLookupMessages, setLocationLookupMessages] = useState<
    Record<number, string>
  >({});
  const [editingSiteNameKey, setEditingSiteNameKey] = useState<string | null>(
    null,
  );
  const [siteNameDraft, setSiteNameDraft] = useState("");
  const [siteNameSaving, setSiteNameSaving] = useState(false);
  const [siteNameMessage, setSiteNameMessage] = useState("");
  const [showNewSite, setShowNewSite] = useState(false);
  const [newSiteDraft, setNewSiteDraft] = useState({
    site: "",
    location: "",
    address: "",
    coordinates: "",
  });
  const [newSiteSaving, setNewSiteSaving] = useState(false);
  const [newSiteMessage, setNewSiteMessage] = useState("");
  const [siteDocumentsByKey, setSiteDocumentsByKey] = useState<
    Record<string, SiteDocument[]>
  >({});
  const [siteDocumentCounts, setSiteDocumentCounts] = useState<
    Record<string, number> | null
  >(null);
  const plannedSitesSyncedRef = useRef(false);
  const [siteDocumentLoadingKey, setSiteDocumentLoadingKey] = useState<
    string | null
  >(null);
  const [siteDocumentUploadingKey, setSiteDocumentUploadingKey] = useState<
    string | null
  >(null);
  const [siteDocumentMessages, setSiteDocumentMessages] = useState<
    Record<string, string>
  >({});
  const [toolCategory, setToolCategory] = useState<ToolCategory>("通常業務");
  const [toolSets, setToolSets] = useState<ToolChecklistSet[]>([]);
  const [toolsReady, setToolsReady] = useState(false);
  const [toolMessage, setToolMessage] = useState("");
  const [masterOptions, setMasterOptions] = useState<
    Record<"work" | "person", MasterOption[]>
  >({ work: [], person: [] });
  const [masterDrafts, setMasterDrafts] = useState<
    Record<"work" | "person", string>
  >({ work: "", person: "" });
  const [masterMessage, setMasterMessage] = useState("");
  const [fixedWorkOrder, setFixedWorkOrder] = useState(FIXED_WORK_OPTIONS);
  const [newToolSetName, setNewToolSetName] = useState("");
  const [newToolNames, setNewToolNames] = useState<Record<number, string>>({});
  const [toolDraggingKey, setToolDraggingKey] = useState<string | null>(null);
  const toolSetsRef = useRef<ToolChecklistSet[]>([]);
  const toolDragRef = useRef<ToolDragState | null>(null);
  const automaticGoogleSyncStartedRef = useRef(false);
  const [showHolidayRange, setShowHolidayRange] = useState(false);
  const [holidayRange, setHolidayRange] = useState({
    start: "",
    end: "",
    label: "",
  });
  const [holidayRangeSaving, setHolidayRangeSaving] = useState(false);
  const [holidayRangeMessage, setHolidayRangeMessage] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("fixed-work-order-v1") || "[]",
      ) as string[];
      const valid = saved.filter((name) => FIXED_WORK_OPTIONS.includes(name));
      setFixedWorkOrder([...new Set([...valid, ...FIXED_WORK_OPTIONS])]);
    } catch {
      setFixedWorkOrder(FIXED_WORK_OPTIONS);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("sakaguchi-entries-cache-v1");
      if (cached) setEntries(JSON.parse(cached));
    } catch {
      /* キャッシュが壊れていても最新データを取得する */
    }
    setReady(true);
    const controller = new AbortController();
    fetch("/api/entries", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("履歴を読み込めませんでした");
        return response.json();
      })
      .then((data) => {
        setEntries(data.entries);
        try {
          localStorage.setItem(
            "sakaguchi-entries-cache-v1",
            JSON.stringify(data.entries),
          );
        } catch {
          /* 保存容量不足でも通常動作を続ける */
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (activeTab !== "settings") return;
    (["work", "person"] as const).forEach((type) =>
      fetch(`/api/masters?type=${type}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "マスターを読み込めませんでした");
          setMasterOptions((current) => ({ ...current, [type]: data.options }));
        })
        .catch((e) => setMasterMessage(e.message)),
    );
  }, [activeTab]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("sakaguchi-sites-cache-v1");
      if (cached) setSiteMasters(JSON.parse(cached));
    } catch {
      /* 最新データの取得へ進む */
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch("/api/sites", { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "現場一覧を読み込めませんでした");
          setSiteMasters(data.sites);
          try {
            localStorage.setItem(
              "sakaguchi-sites-cache-v1",
              JSON.stringify(data.sites),
            );
          } catch {}
        })
        .catch((e) => {
          if (e instanceof Error && e.name !== "AbortError")
            setNewSiteMessage(e.message);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch("/api/calendar-settings", { signal: controller.signal })
        .then((response) => response.json())
        .then((data) => setCalendarSettings(data.settings))
        .catch(() => undefined);
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (plannedSitesSyncedRef.current || !entries.length) return;
    plannedSitesSyncedRef.current = true;
    entries
      .filter(
        (entry) =>
          entry.date > today() && ["1日", "半日"].includes(entry.type),
      )
      .reduce(
        (task, entry) => task.then(() => registerPlannedSites(entry)),
        Promise.resolve(),
      )
      .catch(() => undefined);
  }, [entries]);

  useEffect(() => {
    if (activeTab !== "sites" || siteDocumentCounts !== null) return;
    const controller = new AbortController();
    fetch("/api/site-documents?counts=1", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "資料件数を読み込めませんでした");
        setSiteDocumentCounts(data.counts ?? {});
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setSiteDocumentMessages((current) => ({
            ...current,
            __counts__: error.message,
          }));
      });
    return () => controller.abort();
  }, [activeTab, siteDocumentCounts]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch("/api/google/settings", { signal: controller.signal })
        .then((response) => response.json())
        .then((data) => {
          setGoogleConnection(data.settings);
          setGoogleClientId(data.settings.clientId || "");
          const params = new URLSearchParams(window.location.search);
          if (params.get("google") === "connected")
            setGoogleConnectionMessage("Googleアカウントを連携しました");
          if (params.get("google") === "error")
            setGoogleConnectionMessage(
              params.get("message") || "Google連携に失敗しました",
            );
        })
        .catch(() => undefined);
    }, 750);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (activeTab === "tools" && !toolsReady) void loadTools();
    if (activeTab === "settings" && googleConnection.connected)
      void loadSyncDashboard();
  }, [activeTab]);

  useEffect(() => {
    if (!googleConnection.connected) return;
    const run = () => {
      if (document.visibilityState !== "visible") return;
      const lastRun = Number(
        sessionStorage.getItem("sakaguchi-last-auto-google-sync") || 0,
      );
      if (Date.now() - lastRun < 4 * 60_000) return;
      sessionStorage.setItem(
        "sakaguchi-last-auto-google-sync",
        String(Date.now()),
      );
      void reconcileGoogle(false);
    };
    let initialTimer: number | undefined;
    if (!automaticGoogleSyncStartedRef.current) {
      automaticGoogleSyncStartedRef.current = true;
      initialTimer = window.setTimeout(run, 3000);
    }
    const timer = window.setInterval(run, 5 * 60_000);
    return () => {
      if (initialTimer) window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [googleConnection.connected]);

  useEffect(() => {
    toolSetsRef.current = toolSets;
  }, [toolSets]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sakaguchi-coordinate-regions");
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, RegionInfo>;
        const valid = Object.fromEntries(
          Object.entries(parsed).filter(
            ([, region]) =>
              !region.prefecture.includes("未設定") &&
              !region.municipality.includes("未設定"),
          ),
        );
        setCoordinateRegions(valid);
        localStorage.setItem(
          "sakaguchi-coordinate-regions",
          JSON.stringify(valid),
        );
      }
      const savedAddresses = localStorage.getItem(
        "sakaguchi-coordinate-addresses",
      );
      if (savedAddresses)
        setCoordinateAddresses(JSON.parse(savedAddresses));
    } catch {}
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setNotificationStatus(
          typeof Notification === "undefined"
            ? "unsupported"
            : Notification.permission,
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedTab = localStorage.getItem(
          "sakaguchi-attendance-active-tab",
        ) as AppTab | null;
        if (
          savedTab &&
          [
            "entry",
            "history",
            "plans",
            "summary",
            "sites",
            "tools",
            "shiftboard",
            "settings",
          ].includes(savedTab)
        )
          setActiveTab(savedTab);
        const savedSkin = localStorage.getItem("sakaguchi-attendance-skin");
        if (savedSkin === "dark") {
          setSkin("green");
          localStorage.setItem("sakaguchi-attendance-skin", "green");
        }
        if (
          savedSkin &&
          ["green", "black", "blue", "purple", "brown"].includes(savedSkin)
        )
          setSkin(savedSkin as Skin);
        const savedFontSize = localStorage.getItem(
          "sakaguchi-attendance-font-size",
        ) as FontSize | null;
        if (savedFontSize && ["small", "standard", "large"].includes(savedFontSize))
          setFontSize(savedFontSize);
        const savedTransfer = localStorage.getItem("sakaguchi-shiftboard-done");
        if (savedTransfer) setShiftBoardDone(JSON.parse(savedTransfer));
        const savedPaySettings = localStorage.getItem("sakaguchi-pay-settings");
        if (savedPaySettings)
          setPaySettings({
            ...defaultPaySettings,
            ...JSON.parse(savedPaySettings),
          });
      } catch {
        /* 端末設定が読めない場合は既定表示を使う */
      } finally {
        // 保存済みスキンの読み込み前に既定値を上書きしないようにする。
        setSkinReady(true);
        setFontSizeReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = skin;
    if (!skinReady) return;
    try {
      localStorage.setItem("sakaguchi-attendance-skin", skin);
    } catch {
      /* 選択自体は続ける */
    }
  }, [skin, skinReady]);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    if (!fontSizeReady) return;
    try {
      localStorage.setItem("sakaguchi-attendance-font-size", fontSize);
    } catch {
      /* 選択自体は続ける */
    }
  }, [fontSize, fontSizeReady]);

  useEffect(() => {
    try {
      localStorage.setItem("sakaguchi-attendance-active-tab", activeTab);
    } catch {
      /* タブ切替自体は続ける */
    }
  }, [activeTab]);

  useEffect(() => {
    if (!ready || notificationStatus !== "granted") return;
    const notifyIfMissing = () => {
      const now = new Date();
      const hour = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          hour12: false,
        }).format(now),
      );
      const date = today();
      const [year, monthNumber, day] = date.split("-").map(Number);
      const lastDay = new Date(year, monthNumber, 0).getDate();
      const shiftBoardReminderKey = `shiftboard-reminded-${year}-${String(monthNumber).padStart(2, "0")}`;
      if (
        hour >= 21 &&
        day === lastDay - 1 &&
        localStorage.getItem(shiftBoardReminderKey) !== date
      ) {
        new Notification("シフトボード入力のお知らせ", {
          body: "月末前日です。シフトボードへ今月分の勤務と休みを入力してください。",
        });
        localStorage.setItem(shiftBoardReminderKey, date);
      }
      if (
        hour < 21 ||
        entries.some((entry) => entry.date === date) ||
        localStorage.getItem("worknote-reminded-date") === date
      )
        return;
      new Notification("坂口商会総合管理システム｜入力のお知らせ", {
        body: "今日の勤務記録がまだ入力されていません。忘れないうちに記録しましょう。",
      });
      localStorage.setItem("worknote-reminded-date", date);
    };
    notifyIfMissing();
    const timer = window.setInterval(notifyIfMissing, 60000);
    return () => window.clearInterval(timer);
  }, [entries, notificationStatus, ready]);

  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, month],
  );
  const completedMonthEntries = useMemo(
    () => monthEntries.filter((entry) => entry.date <= currentDate),
    [monthEntries, currentDate],
  );
  const selectedYear = month.slice(0, 4);
  const completedYearEntries = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            entry.date.startsWith(`${selectedYear}-`) && entry.date <= today(),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, selectedYear],
  );
  const summaryEntries =
    summaryPeriod === "annual" ? completedYearEntries : completedMonthEntries;
  const plannedMonthEntries = useMemo(
    () => monthEntries.filter((entry) => entry.date > currentDate),
    [monthEntries, currentDate],
  );
  const todayEntries = entries
    .filter((entry) => entry.date === currentDate)
    .sort((a, b) => a.start.localeCompare(b.start));
  const tomorrowDate = nextDate(currentDate);
  const tomorrowEntries = entries
    .filter((entry) => entry.date === tomorrowDate)
    .sort((a, b) => a.start.localeCompare(b.start));
  const featuredPlanGroups = [
    {
      id: "today-plans-title",
      title: "本日の予定",
      date: currentDate,
      entries: todayEntries,
      loading: "本日の予定を読み込んでいます…",
      emptyTitle: "本日の予定はありません",
      emptyHelp: "入力タブから本日の勤務内容を登録できます。",
    },
    {
      id: "tomorrow-plans-title",
      title: "明日の予定",
      date: tomorrowDate,
      entries: tomorrowEntries,
      loading: "明日の予定を読み込んでいます…",
      emptyTitle: "明日の予定はありません",
      emptyHelp: "入力タブから明日の勤務内容を登録できます。",
    },
  ];
  const visibleRecordEntries =
    activeTab === "plans"
      ? plannedMonthEntries
          .filter((entry) => entry.date > tomorrowDate)
          .sort((a, b) => a.date.localeCompare(b.date))
      : completedMonthEntries;
  const shiftBoardEntries = useMemo(
    () => [...monthEntries].sort((a, b) => a.date.localeCompare(b.date)),
    [monthEntries],
  );
  const shiftBoardGroups = useMemo(() => {
    const normal: Entry[] = [];
    const exceptions: Entry[] = [];
    const daysOff: Entry[] = [];
    shiftBoardEntries.forEach((entry) => {
      if (entry.type === "休み") {
        daysOff.push(entry);
        return;
      }
      const range = shiftBoardRange(entry);
      if (
        entry.type === "1日" &&
        range.start === "08:00" &&
        range.end === "17:00"
      )
        normal.push(entry);
      else exceptions.push(entry);
    });
    return { normal, exceptions, daysOff };
  }, [shiftBoardEntries]);
  const pendingShiftBoardEntries = useMemo(
    () =>
      shiftBoardEntries.filter(
        (entry) => !shiftBoardDone.includes(shiftBoardFingerprint(entry)),
      ),
    [shiftBoardDone, shiftBoardEntries],
  );
  const completedShiftBoardEntries = useMemo(
    () =>
      shiftBoardEntries.filter((entry) =>
        shiftBoardDone.includes(shiftBoardFingerprint(entry)),
      ),
    [shiftBoardDone, shiftBoardEntries],
  );
  const calendarDays = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const byDate = visibleRecordEntries.reduce<Record<string, Entry[]>>(
      (groups, entry) => {
        (groups[entry.date] ??= []).push(entry);
        return groups;
      },
      {},
    );
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = `${month}-${String(day).padStart(2, "0")}`;
        return { day, date, entries: byDate[date] ?? [] };
      }),
    ];
  }, [month, visibleRecordEntries]);
  const calendarHolidays = useMemo(
    () => japaneseHolidays(Number(month.slice(0, 4))),
    [month],
  );
  const summary = useMemo(
    () =>
      summaryEntries.reduce(
        (acc, entry) => {
          if (entry.type === "1日") acc.days += 1;
          if (entry.type === "半日") acc.days += 0.5;
          acc.work += workMinutes(entry);
          const extra = extraMinutes(entry);
          acc.early += extra.early;
          acc.overtime += extra.overtime;
          if (entry.businessTrip) acc.trips += 1;
          if (entry.businessTrip && entry.dinnerType === "自費")
            acc.selfDinner += 1;
          return acc;
        },
        { days: 0, work: 0, early: 0, overtime: 0, trips: 0, selfDinner: 0 },
      ),
    [summaryEntries],
  );
  const estimatedPay = useMemo(() => {
    const dailyRate = Number(paySettings.dailyRate);
    const standardHours = Number(paySettings.standardHours);
    const multiplier = Number(paySettings.overtimeMultiplier);
    if (!dailyRate || !standardHours || !multiplier) return null;
    const base = Math.round(summary.days * dailyRate);
    const extra = Math.round(
      ((summary.early + summary.overtime) / 60) *
        (dailyRate / standardHours) *
        multiplier,
    );
    return { base, extra, total: base + extra };
  }, [paySettings, summary.days, summary.early, summary.overtime]);
  const selfDinnerEntries = useMemo(
    () =>
      completedMonthEntries.filter(
        (entry) => entry.businessTrip && entry.dinnerType === "自費",
      ),
    [completedMonthEntries],
  );
  const annualHotelNights = useMemo(
    () =>
      new Set(
        entries
          .filter(
            (entry) =>
              entry.date.startsWith(`${month.slice(0, 4)}-`) &&
              entry.date <= today() &&
              entry.businessTrip &&
              entry.hotelName.trim(),
          )
          .map((entry) => entry.date),
      ).size,
    [entries, month],
  );
  const annualRankings = useMemo(() => {
    const sites = new Map<string, number>();
    const people = new Map<string, number>();
    const hotels = new Map<string, number>();
    completedYearEntries
      .filter((entry) => ["1日", "半日"].includes(entry.type))
      .forEach((entry) =>
        entrySiteRows(entry).forEach((row) => {
          const label =
            [row.location, row.site].filter(Boolean).join("／") ||
            row.address ||
            row.coordinates ||
            "名称なし";
          sites.set(label, (sites.get(label) ?? 0) + 1);
          splitNames(row.personnelNames)
            .filter(
              (name) => name.normalize("NFKC").replace(/\s+/g, "") !== "子野井",
            )
            .forEach((name) => people.set(name, (people.get(name) ?? 0) + 1));
        }),
      );
    completedYearEntries
      .filter((entry) => entry.businessTrip && entry.hotelName.trim())
      .forEach((entry) =>
        hotels.set(
          entry.hotelName.trim(),
          (hotels.get(entry.hotelName.trim()) ?? 0) + 1,
        ),
      );
    const rank = (values: Map<string, number>) =>
      [...values.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
        .slice(0, 5);
    return { sites: rank(sites), people: rank(people), hotels: rank(hotels) };
  }, [completedYearEntries]);
  const siteCards = useMemo(() => {
    const cards = new Map<string, SiteCardData>();
    siteMasters
      .filter((master) => !master.archivedAt)
      .forEach((master) => {
        const card: SiteCardData = {
          masterId: master.id,
          site: master.site,
          location: master.location,
          address: master.address,
          coordinates: master.coordinates,
          visits: 0,
          workDays: 0,
          tripCount: 0,
          lastDate: "",
          works: new Set<string>(),
          people: new Set<string>(),
          notes: [],
        };
        cards.set(siteCardKey(card), card);
      });
    entries
      .filter(
        (entry) =>
          entry.date > today() && ["1日", "半日"].includes(entry.type),
      )
      .forEach((entry) =>
        entrySiteRows(entry)
          .filter((row) => row.site)
          .forEach((row) => {
            const key = siteCardKey(row);
            const card = cards.get(key) ?? {
              site: row.site,
              location: row.location,
              address: row.address,
              coordinates: row.coordinates,
              visits: 0,
              workDays: 0,
              tripCount: 0,
              lastDate: "",
              works: new Set<string>(),
              people: new Set<string>(),
              notes: [],
            };
            if (!card.location && row.location) card.location = row.location;
            if (!card.address && row.address) card.address = row.address;
            if (!card.coordinates && row.coordinates)
              card.coordinates = row.coordinates;
            cards.set(key, card);
          }),
      );
    entries
      .filter(
        (entry) =>
          entry.date <= today() && ["1日", "半日"].includes(entry.type),
      )
      .forEach((entry) =>
        entrySiteRows(entry).forEach((row) => {
          const key = siteCardKey(row);
          const card = cards.get(key) ?? {
            site: row.site,
            location: row.location,
            address: row.address,
            coordinates: row.coordinates,
            visits: 0,
            workDays: 0,
            tripCount: 0,
            lastDate: "",
            works: new Set<string>(),
            people: new Set<string>(),
            notes: [],
          };
          const isNewest = !card.lastDate || entry.date > card.lastDate;
          if (isNewest) {
            card.site = row.site || card.site;
            card.location = row.location || card.location;
          }
          if (row.address && (isNewest || !card.address))
            card.address = row.address;
          if (row.coordinates && (isNewest || !card.coordinates))
            card.coordinates = row.coordinates;
          card.visits += 1;
          card.workDays +=
            entry.type === "1日" ? 1 : entry.type === "半日" ? 0.5 : 0;
          if (entry.businessTrip) card.tripCount += 1;
          if (entry.date > card.lastDate) card.lastDate = entry.date;
          row.work
            .split("・")
            .filter(Boolean)
            .forEach((work) => card.works.add(work));
          splitNames(row.personnelNames).forEach((name) =>
            card.people.add(name),
          );
          if (row.note) card.notes.push({ date: entry.date, note: row.note });
          cards.set(key, card);
        }),
      );
    return [...cards.values()].sort(
      (a, b) =>
        b.lastDate.localeCompare(a.lastDate) ||
        a.site.localeCompare(b.site, "ja"),
    );
  }, [entries, siteMasters]);
  const filteredSiteCards = useMemo(() => {
    const normalize = (value: string) =>
      value.normalize("NFKC").trim().replace(/\s+/g, "").toLocaleLowerCase();
    const query = normalize(siteCardSearch);
    return siteCards.filter((card) => {
      const matchesSearch = !query || normalize(card.site).includes(query);
      const resolvedAddress =
        card.address ||
        coordinateAddresses[coordinateKey(card.coordinates)] ||
        "";
      const hasAddress = Boolean(resolvedAddress.trim());
      const matchesAddress =
        siteAddressFilter === "all" ||
        (siteAddressFilter === "registered" ? hasAddress : !hasAddress);
      const documentCount = siteDocumentCounts?.[siteCardKey(card)] ?? 0;
      const matchesDocuments =
        siteDocumentFilter === "all" ||
        siteDocumentCounts === null ||
        (siteDocumentFilter === "has" ? documentCount > 0 : documentCount === 0);
      return matchesSearch && matchesAddress && matchesDocuments;
    });
  }, [
    coordinateAddresses,
    siteAddressFilter,
    siteCardSearch,
    siteCards,
    siteDocumentCounts,
    siteDocumentFilter,
  ]);
  useEffect(() => {
    const coordinates = [
      ...new Map(
        siteCards
          .filter((card) => {
            const region = parseJapaneseRegion(card.address);
            return (
              !card.address.trim() ||
              !region ||
              region.municipality === "市区町村未設定"
            );
          })
          .map((card) => [coordinateKey(card.coordinates), card.coordinates] as const)
          .filter(([key]) => Boolean(key)),
      ).values(),
    ];
    if (!coordinates.length) return;
    let cancelled = false;
    fetch("/api/regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates, persist: true }),
    })
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("地域を取得できませんでした")),
      )
      .then(
        (data: {
          regions?: Record<string, RegionInfo>;
          addresses?: Record<string, string>;
          updates?: {
            entries?: Record<string, string>;
            siteMasters?: Record<string, string>;
          };
        }) => {
          if (cancelled) return;
          const additions = data.regions ?? {};
          if (Object.keys(additions).length) {
            setCoordinateRegions((current) => {
              const next = { ...current, ...additions };
              try {
                localStorage.setItem(
                  "sakaguchi-coordinate-regions",
                  JSON.stringify(next),
                );
              } catch {}
              return next;
            });
          }
          const addressAdditions = data.addresses ?? {};
          if (Object.keys(addressAdditions).length) {
            setCoordinateAddresses((current) => {
              const next = { ...current, ...addressAdditions };
              try {
                localStorage.setItem(
                  "sakaguchi-coordinate-addresses",
                  JSON.stringify(next),
                );
              } catch {}
              return next;
            });
          }
          const entryUpdates = data.updates?.entries ?? {};
          if (Object.keys(entryUpdates).length) {
            setEntries((current) => {
              const next = current.map((entry) =>
                entryUpdates[entry.id]
                  ? { ...entry, address: entryUpdates[entry.id] }
                  : entry,
              );
              try {
                localStorage.setItem(
                  "sakaguchi-entries-cache-v1",
                  JSON.stringify(next),
                );
              } catch {}
              return next;
            });
          }
          const masterUpdates = data.updates?.siteMasters ?? {};
          if (Object.keys(masterUpdates).length) {
            setSiteMasters((current) => {
              const next = current.map((site) =>
                masterUpdates[String(site.id)]
                  ? { ...site, address: masterUpdates[String(site.id)] }
                  : site,
              );
              try {
                localStorage.setItem(
                  "sakaguchi-sites-cache-v1",
                  JSON.stringify(next),
                );
              } catch {}
              return next;
            });
          }
        },
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [siteCards]);
  const groupedSiteCards = useMemo(() => {
    const prefectureGroups = new Map<string, SiteCardData[]>();
    filteredSiteCards.forEach((card) => {
      const { prefecture } = cardRegionInfo(card, coordinateRegions);
      prefectureGroups.set(prefecture, [
        ...(prefectureGroups.get(prefecture) ?? []),
        card,
      ]);
    });

    const sortUnsetLast = (a: string, b: string) =>
      a.includes("未設定")
        ? 1
        : b.includes("未設定")
          ? -1
          : a.localeCompare(b, "ja");

    const sortWithinPrefecture = (cards: SiteCardData[]) =>
      [...cards].sort((a, b) => {
        if (siteCardSort === "name") {
          return a.site.localeCompare(b.site, "ja", { sensitivity: "base" });
        }
        const aDate = a.lastDate || "";
        const bDate = b.lastDate || "";
        // 前回訪問日の並べ替えでは、未訪問を常に最後にまとめる。
        if (!aDate && !bDate) return a.site.localeCompare(b.site, "ja");
        if (!aDate) return 1;
        if (!bDate) return -1;
        const dateOrder =
          siteCardSort === "oldest"
            ? aDate.localeCompare(bDate)
            : bDate.localeCompare(aDate);
        return dateOrder || a.site.localeCompare(b.site, "ja");
      });

    return [...prefectureGroups.entries()]
      .sort(([a], [b]) => sortUnsetLast(a, b))
      .map(([prefecture, prefectureCards]) => {
        if (siteCardSort !== "region") {
          // 地域順以外では県の区切りだけ残し、市区町村をまたいで県内を1本に並べる。
          const cards = sortWithinPrefecture(prefectureCards);
          return {
            prefecture,
            label: prefecture,
            count: cards.length,
            municipalities: [["", cards]] as [string, SiteCardData[]][],
            flat: true,
          };
        }

        const municipalities = new Map<string, SiteCardData[]>();
        prefectureCards.forEach((card) => {
          const { municipality } = cardRegionInfo(card, coordinateRegions);
          municipalities.set(municipality, [
            ...(municipalities.get(municipality) ?? []),
            card,
          ]);
        });
        return {
          prefecture,
          label: prefecture,
          count: prefectureCards.length,
          municipalities: [...municipalities.entries()]
            .sort(([a], [b]) => sortUnsetLast(a, b))
            .map(([municipality, cards]) => [
              municipality,
              [...cards].sort((a, b) => a.site.localeCompare(b.site, "ja")),
            ] as [string, SiteCardData[]]),
          flat: false,
        };
      });
  }, [coordinateRegions, filteredSiteCards, siteCardSort]);
  const visibleToolSets = useMemo(
    () => toolSets.filter((set) => set.category === toolCategory),
    [toolSets, toolCategory],
  );
  const visibleToolItems = useMemo(
    () => visibleToolSets.flatMap((set) => set.items),
    [visibleToolSets],
  );
  const checkedToolCount = visibleToolItems.filter(
    (item) => item.checked,
  ).length;
  const rawFormSites = form.site ? form.site.split(SITE_SEPARATOR) : [];
  const rawFormLocations = form.location
    ? form.location.split(SITE_SEPARATOR)
    : [];
  const rawFormAddresses = form.address
    ? form.address.split(SITE_SEPARATOR)
    : [];
  const rawFormCoordinates = form.coordinates
    ? form.coordinates.split(SITE_SEPARATOR)
    : [];
  const rawPersonnelNames = form.personnelNames
    ? form.personnelNames.split(SITE_SEPARATOR)
    : [];
  const rawFormWorks = form.work ? form.work.split(SITE_SEPARATOR) : [];
  const rawFormStarts = form.start ? form.start.split(SITE_SEPARATOR) : [];
  const rawFormEnds = form.end ? form.end.split(SITE_SEPARATOR) : [];
  const rawFormNotes = form.note ? form.note.split(SITE_SEPARATOR) : [];
  const siteRowCount = Math.max(
    rawFormSites.length,
    rawFormLocations.length,
    rawFormAddresses.length,
    rawFormCoordinates.length,
    rawPersonnelNames.length,
    rawFormWorks.length,
    rawFormStarts.length,
    rawFormEnds.length,
    rawFormNotes.length,
    1,
  );
  const formSites = Array.from(
    { length: siteRowCount },
    (_, index) => rawFormSites[index] ?? "",
  );
  const formLocations = Array.from(
    { length: siteRowCount },
    (_, index) => rawFormLocations[index] ?? "",
  );
  const formAddresses = Array.from(
    { length: siteRowCount },
    (_, index) => rawFormAddresses[index] ?? "",
  );
  const formCoordinates = Array.from(
    { length: siteRowCount },
    (_, index) => rawFormCoordinates[index] ?? "",
  );
  const formPersonnelNames = Array.from(
    { length: siteRowCount },
    (_, index) => rawPersonnelNames[index] ?? "",
  );
  const formWorks = Array.from(
    { length: siteRowCount },
    (_, index) => rawFormWorks[index] ?? "",
  );
  const formStarts = Array.from(
    { length: siteRowCount },
    (_, index) =>
      rawFormStarts[index] ??
      (rawFormStarts.length === 1 ? rawFormStarts[0] : "08:00"),
  );
  const formEnds = Array.from(
    { length: siteRowCount },
    (_, index) =>
      rawFormEnds[index] ??
      (rawFormEnds.length === 1 ? rawFormEnds[0] : "17:00"),
  );
  const formNotes = Array.from(
    { length: siteRowCount },
    (_, index) => rawFormNotes[index] ?? "",
  );
  const knownSites = useMemo(
    () =>
      Array.from(
        new Set(entries.flatMap((entry) => splitSites(entry.site))),
      ).sort((a, b) => a.localeCompare(b, "ja")),
    [entries],
  );
  const knownLocations = useMemo(
    () =>
      Array.from(
        new Set(entries.flatMap((entry) => splitSites(entry.location))),
      ).sort((a, b) => a.localeCompare(b, "ja")),
    [entries],
  );
  const knownAddresses = useMemo(
    () =>
      Array.from(
        new Set(entries.flatMap((entry) => splitSites(entry.address))),
      ).sort((a, b) => a.localeCompare(b, "ja")),
    [entries],
  );
  const knownPersonnelNames = useMemo(() => {
    const active = masterOptions.person
      .filter((option) => !option.archivedAt)
      .map((option) => option.name);
    return active.length
      ? active
      : Array.from(
          new Set(
            entries.flatMap((entry) =>
              entry.personnelNames.split(SITE_SEPARATOR).flatMap(splitNames),
            ),
          ),
        ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [entries, masterOptions.person]);
  const knownWorkOptions = useMemo(() => {
    const custom = masterOptions.work
      .filter((option) => !option.archivedAt)
      .map((option) => option.name)
      .filter(
        (name) =>
          !FIXED_WORK_OPTIONS.includes(name) &&
          name !== GARBAGE_DISPOSAL_OPTION,
      );
    return [...new Set([...fixedWorkOrder, ...custom])];
  }, [fixedWorkOrder, masterOptions.work]);
  const knownHotels = useMemo(
    () =>
      Array.from(
        new Set(entries.map((entry) => entry.hotelName.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "ja")),
    [entries],
  );
  const previousSiteVisits = useMemo(() => {
    const sites = form.site ? form.site.split(SITE_SEPARATOR) : [];
    const locations = form.location ? form.location.split(SITE_SEPARATOR) : [];
    const addresses = form.address ? form.address.split(SITE_SEPARATOR) : [];
    const coordinates = form.coordinates
      ? form.coordinates.split(SITE_SEPARATOR)
      : [];
    const count = Math.max(
      sites.length,
      locations.length,
      addresses.length,
      coordinates.length,
      1,
    );
    return Object.fromEntries(
      Array.from({ length: count }, (_, index) => ({
        site: sites[index]?.trim() ?? "",
        location: locations[index]?.trim() ?? "",
        address: addresses[index]?.trim() ?? "",
        coordinates: coordinates[index]?.trim() ?? "",
      }))
        .filter(
          (pair) =>
            pair.site || pair.location || pair.address || pair.coordinates,
        )
        .map(({ site, location, address, coordinates }) => {
          const previous =
            entries
              .filter(
                (entry) =>
                  entry.id !== editingId &&
                  entry.date < form.date &&
                  entrySiteRows(entry).some((pair) =>
                    site
                      ? pair.site === site &&
                        (!location || pair.location === location)
                      : coordinates
                        ? pair.coordinates === coordinates
                        : address
                          ? pair.address === address
                          : pair.location === location,
                  ),
              )
              .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
          return [
            `${location}\u0000${site}\u0000${address}\u0000${coordinates}`,
            previous,
          ];
        }),
    );
  }, [
    entries,
    editingId,
    form.site,
    form.location,
    form.address,
    form.coordinates,
    form.date,
  ]);
  const currentExtra = extraMinutes(form);
  const formIsPlanned = form.date > today();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.type === "休み") {
      if (!form.date || !offEndDate) {
        setError("休みの開始日と終了日を選択してください");
        return;
      }
      if (offEndDate < form.date) {
        setError("休みの終了日は開始日以降にしてください");
        return;
      }
      const offReason = form.note.trim() || "休み";
      const dates: string[] = [];
      let cursor = form.date;
      while (cursor <= offEndDate && dates.length <= 366) {
        dates.push(cursor);
        cursor = nextDate(cursor);
      }
      if (dates.length > 366) {
        setError("一度に登録できる休みは最長366日です");
        return;
      }
      const conflicting = entries.filter(
        (entry) =>
          dates.includes(entry.date) &&
          entry.id !== editingId &&
          entry.type !== "休み",
      ).length;
      if (
        conflicting &&
        !window.confirm(
          `期間内の勤務記録・予定${conflicting}件を休みに変更します。よろしいですか？`,
        )
      )
        return;
      setSaving(true);
      setError("");
      const updated = new Map<string, Entry>();
      const created: Entry[] = [];
      let failed = 0;
      for (const date of dates) {
        const existingForDate =
          editingId && date === form.date
            ? entries.filter((entry) => entry.id === editingId)
            : entries.filter((entry) => entry.date === date);
        const targets: (Entry | null)[] = existingForDate.length
          ? existingForDate
          : [null];
        for (
          let targetIndex = 0;
          targetIndex < targets.length;
          targetIndex += 1
        ) {
          const existing = targets[targetIndex];
          const payload = {
            ...emptyEntry(),
            id: existing ? Number(existing.id) : undefined,
            date,
            type: "休み" as WorkType,
            start: "",
            end: "",
            site: "",
            location: "",
            address: "",
            coordinates: "",
            personnelNames: "",
            work: "",
            note: offReason,
            businessTrip: false,
            dinnerType: "",
            hotelName: "",
            calendarEndDate: undefined,
            suppressCalendar: new Date(`${date}T00:00:00Z`).getUTCDay() === 0,
          };
          try {
            const response = await fetch("/api/entries", {
              method: existing ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok)
              throw new Error(data.error || "保存できませんでした");
            if (existing) updated.set(existing.id, data.entry);
            else created.push(data.entry);
            if (data.warning) setError(`休みは保存しました。${data.warning}`);
          } catch {
            failed += 1;
          }
        }
      }
      setEntries((items) => [
        ...items.map((item) => updated.get(item.id) ?? item),
        ...created,
      ]);
      setMonth(form.date.slice(0, 7));
      if (failed)
        setError(`${dates.length}日間のうち${failed}件を保存できませんでした`);
      else {
        setForm(emptyEntry());
        setOffEndDate(today());
        setEditingId(null);
      }
      setSaving(false);
      return;
    }
    if (
      ["1日", "半日"].includes(form.type) &&
      formStarts.some(
        (start, index) =>
          !start ||
          !formEnds[index] ||
          toMinutes(formEnds[index]) <= toMinutes(start),
      )
    ) {
      setError("各現場の終了時刻は開始時刻より後に設定してください");
      return;
    }
    if (
      form.businessTrip &&
      (!form.dinnerType || (!formIsPlanned && form.dinnerType === "未定"))
    ) {
      setError(
        formIsPlanned
          ? "出張予定の夜ご飯を選択してください"
          : "出張日の夜ご飯を実際の内容に変更してください",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/entries", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: editingId ? Number(editingId) : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存できませんでした");
      setEntries((items) =>
        editingId
          ? items.map((item) => (item.id === editingId ? data.entry : item))
          : [...items, data.entry],
      );
      let siteWarning = "";
      if (data.entry.date > today()) {
        try {
          await registerPlannedSites(data.entry);
        } catch (error) {
          siteWarning =
            error instanceof Error
              ? error.message
              : "現場一覧へ登録できませんでした";
        }
      }
      setMonth(form.date.slice(0, 7));
      setForm(emptyEntry());
      setOffEndDate(today());
      setEditingId(null);
      if (data.warning || siteWarning)
        setError(
          `勤務記録は保存しました。${[data.warning, siteWarning].filter(Boolean).join(" ")}`,
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存できませんでした");
    } finally {
      setSaving(false);
    }
  }

  async function createBasicSchedule() {
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const existingDates = new Set(entries.map((entry) => entry.date));
    const targets = Array.from({ length: daysInMonth }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, "0")}`;
      const weekday = new Date(`${date}T00:00:00+09:00`).getDay();
      return { date, weekday };
    }).filter(
      ({ date, weekday }) =>
        weekday !== 0 && date > today() && !existingDates.has(date),
    );
    if (!targets.length) {
      setBulkPlanMessage("追加できる未来の日付はありません");
      return;
    }
    if (
      !window.confirm(
        `${month.replace("-", "年")}月の基本予定を作成します。\n月曜〜土曜 ${targets.length}日（8:00〜17:00）\n日曜日には何も登録しません。既存の記録は変更しません。`,
      )
    )
      return;
    setBulkPlanning(true);
    setBulkPlanMessage(`基本予定を作成しています… 0/${targets.length}`);
    const created: Entry[] = [];
    let failed = 0;
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      const payload = {
        ...emptyEntry(),
        date: target.date,
        type: "1日" as WorkType,
        start: "08:00",
        end: "17:00",
      };
      try {
        const response = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "保存できませんでした");
        created.push(data.entry);
      } catch {
        failed += 1;
      }
      setBulkPlanMessage(
        `基本予定を作成しています… ${index + 1}/${targets.length}`,
      );
    }
    setEntries((current) => [...current, ...created]);
    setBulkPlanning(false);
    setBulkPlanMessage(
      failed
        ? `${created.length}日を登録しました（${failed}日は登録できませんでした）`
        : `${created.length}日分の基本予定を登録しました`,
    );
  }

  function toggleHolidayRange() {
    setShowHolidayRange((current) => {
      const next = !current;
      if (next && !holidayRange.start) {
        const start = nextDate(today());
        setHolidayRange({ start, end: start, label: "" });
      }
      return next;
    });
    setHolidayRangeMessage("");
  }

  async function createHolidayRange() {
    if (!holidayRange.start || !holidayRange.end) {
      setHolidayRangeMessage("開始日と終了日を選択してください");
      return;
    }
    if (holidayRange.end < holidayRange.start) {
      setHolidayRangeMessage("終了日は開始日以降にしてください");
      return;
    }
    const dates: string[] = [];
    let cursor = holidayRange.start;
    while (cursor <= holidayRange.end && dates.length <= 366) {
      dates.push(cursor);
      cursor = nextDate(cursor);
    }
    if (dates.length > 366) {
      setHolidayRangeMessage("設定できる連休は最長366日です");
      return;
    }
    const label = holidayRange.label.trim() || "連休";
    const workEntriesToReplace = entries.filter(
      (entry) => dates.includes(entry.date) && entry.type !== "休み",
    ).length;
    const pastNotice =
      holidayRange.start <= today()
        ? `\n過去を含む期間です。期間内の勤務記録${workEntriesToReplace ? ` ${workEntriesToReplace}件` : ""}も休みに変更されます。`
        : "\n期間中の勤務予定は休みに変更されます。";
    if (
      !window.confirm(
        `${formatDate(holidayRange.start)}〜${formatDate(holidayRange.end)}を「${label}」として休みにします。${pastNotice}`,
      )
    )
      return;
    setHolidayRangeSaving(true);
    setHolidayRangeMessage(`連休を設定しています… 0/${dates.length}`);
    const updated = new Map<string, Entry>();
    const created: Entry[] = [];
    let failed = 0;
    let progress = 0;
    for (const date of dates) {
      const existingForDate = entries.filter((entry) => entry.date === date);
      const targets = existingForDate.length ? existingForDate : [null];
      for (
        let targetIndex = 0;
        targetIndex < targets.length;
        targetIndex += 1
      ) {
        const existing = targets[targetIndex];
        const payload = {
          ...(existing ?? emptyEntry()),
          id: existing ? Number(existing.id) : undefined,
          date,
          type: "休み" as WorkType,
          start: "",
          end: "",
          site: "",
          location: "",
          address: "",
          coordinates: "",
          personnelNames: "",
          work: "",
          note: label,
          businessTrip: false,
          dinnerType: "",
          hotelName: "",
          calendarEndDate: undefined,
          suppressCalendar: new Date(`${date}T00:00:00Z`).getUTCDay() === 0,
        };
        try {
          const response = await fetch("/api/entries", {
            method: existing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "保存できませんでした");
          if (existing) updated.set(existing.id, data.entry);
          else created.push(data.entry);
        } catch {
          failed += 1;
        }
      }
      progress += 1;
      setHolidayRangeMessage(
        `連休を設定しています… ${progress}/${dates.length}`,
      );
    }
    setEntries((current) => [
      ...current.map((entry) => updated.get(entry.id) ?? entry),
      ...created,
    ]);
    setMonth(holidayRange.start.slice(0, 7));
    setHolidayRangeSaving(false);
    setHolidayRangeMessage(
      failed
        ? `${dates.length}日を処理しました（${failed}件は更新できませんでした）`
        : `${dates.length}日間を「${label}」として設定しました`,
    );
  }

  async function saveCalendarSettings() {
    setCalendarMessage("保存しています…");
    const response = await fetch("/api/calendar-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calendarSettings),
    });
    const data = await response.json();
    if (!response.ok) {
      setCalendarMessage(data.error || "設定を保存できませんでした");
      return;
    }
    setCalendarSettings(data.settings);
    setCalendarMessage(
      data.settings.enabled
        ? "Googleカレンダーの自動連携を有効にしました"
        : "設定を保存しました",
    );
  }

  async function saveGoogleConnectionSettings() {
    setGoogleConnectionMessage("安全に保存しています…");
    const response = await fetch("/api/google/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setGoogleConnectionMessage(data.error || "保存できませんでした");
      return;
    }
    setGoogleConnection(data.settings);
    setGoogleClientSecret("");
    setGoogleConnectionMessage(
      "保存しました。続けてGoogleアカウントを連携してください",
    );
  }

  async function disconnectGoogleAccount() {
    if (!window.confirm("Googleアカウントとの連携を解除しますか？")) return;
    const response = await fetch("/api/google/disconnect", { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setGoogleConnectionMessage(data.error || "解除できませんでした");
      return;
    }
    setGoogleConnection((current) => ({
      ...current,
      connected: false,
      email: "",
      name: "",
    }));
    setGoogleConnectionMessage("Googleアカウントとの連携を解除しました");
  }

  async function syncExistingEntries() {
    if (googleSyncing) return;
    setGoogleSyncing(true);
    setGoogleConnectionMessage(
      "過去の記録を反映しています。画面を閉じずにお待ちください…",
    );
    try {
      const response = await fetch("/api/calendar-settings", {
        method: "POST",
      });
      const data = await response.json();
      if (data.spreadsheetUrl) {
        setSpreadsheetUrl(data.spreadsheetUrl);
        setGoogleConnection((current) => ({
          ...current,
          spreadsheetUrl: data.spreadsheetUrl,
        }));
      }
      setGoogleConnectionMessage(
        response.ok
          ? `完了しました。過去の記録${data.synced}件をGoogleへ反映しました`
          : data.error || "反映できませんでした",
      );
    } catch {
      setGoogleConnectionMessage(
        "通信が途中で切れました。もう一度押してください",
      );
    } finally {
      setGoogleSyncing(false);
    }
  }

  async function loadSyncDashboard() {
    if (!googleConnection.connected) return;
    const response = await fetch("/api/google/sync");
    const data = await response.json();
    if (!response.ok) {
      setSyncManagerMessage(data.error || "同期状態を確認できませんでした");
      return;
    }
    setSyncDashboard(data);
    setSelectedDuplicateIds(
      data.duplicates.flatMap(
        (group: SyncDashboard["duplicates"][number]) => group.duplicateEventIds,
      ),
    );
  }

  async function reconcileGoogle(showMessage = true) {
    if (googleSyncing || !googleConnection.connected) return;
    setGoogleSyncing(true);
    if (showMessage) setSyncManagerMessage("Googleカレンダーと照合しています…");
    try {
      const response = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reconcile" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "照合できませんでした");
      if (showMessage) {
        const entriesResponse = await fetch("/api/entries");
        const entriesData = await entriesResponse.json();
        if (entriesResponse.ok) {
          setEntries(entriesData.entries);
          try {
            localStorage.setItem(
              "sakaguchi-entries-cache-v1",
              JSON.stringify(entriesData.entries),
            );
          } catch {}
        }
        setSyncManagerMessage(
          `照合完了：Googleから${data.updated}件更新${data.calendarNormalized ? `・日曜日の休み${data.calendarNormalized}件を整理` : ""}${data.calendarRemoved ? `・Google側で削除された予定${data.calendarRemoved}件を検出（アプリの記録は保持）` : ""}`,
        );
        await loadSyncDashboard();
      }
    } catch (e) {
      if (showMessage)
        setSyncManagerMessage(
          e instanceof Error ? e.message : "照合できませんでした",
        );
    } finally {
      setGoogleSyncing(false);
    }
  }

  async function retrySync(ids: number[]) {
    setGoogleSyncing(true);
    const response = await fetch("/api/google/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry", entryIds: ids }),
    });
    const data = await response.json();
    setSyncManagerMessage(
      response.ok
        ? "再同期が完了しました"
        : data.error || `${data.failed?.length ?? 0}件を再同期できませんでした`,
    );
    setGoogleSyncing(false);
    await loadSyncDashboard();
  }

  async function cleanupDuplicates() {
    if (
      !selectedDuplicateIds.length ||
      !window.confirm(
        `重複予定${selectedDuplicateIds.length}件をGoogleカレンダーから削除しますか？`,
      )
    )
      return;
    setGoogleSyncing(true);
    const response = await fetch("/api/google/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cleanup",
        eventIds: selectedDuplicateIds,
      }),
    });
    const data = await response.json();
    setSyncManagerMessage(
      response.ok
        ? `重複予定${data.deleted}件を整理しました`
        : data.error || "整理できませんでした",
    );
    setGoogleSyncing(false);
    await loadSyncDashboard();
  }

  async function restoreTrash(ids: number[]) {
    const response = await fetch("/api/entries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", ids }),
    });
    const data = await response.json();
    setSyncManagerMessage(
      response.ok
        ? `${data.restored.length}件を復元しました`
        : `${data.failed?.length ?? 0}件を復元できませんでした`,
    );
    await loadSyncDashboard();
  }

  async function removeMany(ids: string[]) {
    if (
      !ids.length ||
      !window.confirm(
        `${ids.length}件を削除しますか？ Googleカレンダーからも削除し、30日間ごみ箱に保存します。`,
      )
    )
      return;
    const response = await fetch("/api/entries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ids.map(Number) }),
    });
    const data = await response.json();
    if (data.deleted?.length) {
      const deleted = new Set(data.deleted.map(String));
      setEntries((items) => items.filter((item) => !deleted.has(item.id)));
      setSelectedPlanIds([]);
    }
    if (!response.ok)
      setError(
        `${data.failed?.length ?? 0}件はGoogleとの削除に失敗したため、アプリに残しました`,
      );
    else
      setSyncManagerMessage(`${data.deleted.length}件をごみ箱へ移動しました`);
  }

  function generateSyncKey() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    setCalendarSettings((current) => ({
      ...current,
      syncKey: Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join(""),
    }));
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      setNotificationStatus("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
  }

  function toggleShiftBoardDone(entry: Entry) {
    const fingerprint = shiftBoardFingerprint(entry);
    setShiftBoardDone((current) => {
      const next = current.includes(fingerprint)
        ? current.filter((value) => value !== fingerprint)
        : [...current, fingerprint];
      try {
        localStorage.setItem("sakaguchi-shiftboard-done", JSON.stringify(next));
      } catch {
        /* チェック自体は続ける */
      }
      return next;
    });
  }

  function updatePaySettings(next: PaySettings) {
    setPaySettings(next);
    try {
      localStorage.setItem("sakaguchi-pay-settings", JSON.stringify(next));
    } catch {
      /* 設定変更自体は続ける */
    }
  }

  function clearShiftBoardDone() {
    const monthFingerprints = new Set(
      shiftBoardEntries.map(shiftBoardFingerprint),
    );
    setShiftBoardDone((current) => {
      const next = current.filter((value) => !monthFingerprints.has(value));
      try {
        localStorage.setItem("sakaguchi-shiftboard-done", JSON.stringify(next));
      } catch {
        /* リセット自体は続ける */
      }
      return next;
    });
  }

  function shiftBoardRow(entry: Entry, done: boolean) {
    const range = shiftBoardRange(entry);
    const isOff = entry.type === "休み";
    const isNormal =
      !isOff &&
      entry.type === "1日" &&
      range.start === "08:00" &&
      range.end === "17:00";
    return (
      <label className={`transfer-row ${done ? "done" : ""}`} key={entry.id}>
        <input
          type="checkbox"
          checked={done}
          onChange={() => toggleShiftBoardDone(entry)}
        />
        <span className="transfer-date">{formatDate(entry.date)}</span>
        <span
          className={`transfer-kind ${isOff ? "off" : isNormal ? "normal" : "exception"}`}
        >
          {isOff ? "休み" : isNormal ? "通常" : entry.type}
        </span>
        <strong>{isOff ? "勤務なし" : `${range.start}〜${range.end}`}</strong>
        {entry.date > today() && <small>予定</small>}
      </label>
    );
  }

  function openSiteLocationEditor(card: SiteCardData) {
    const key = siteCardKey(card);
    if (editingSiteLocationKey === key) {
      setEditingSiteLocationKey(null);
      return;
    }
    setEditingSiteLocationKey(key);
    setSiteLocationDraft({
      location: card.location,
      address:
        card.address ||
        coordinateAddresses[coordinateKey(card.coordinates)] ||
        "",
      coordinates: card.coordinates,
    });
    setSiteLocationMessage("");
  }

  async function createSiteMaster() {
    if (!newSiteDraft.site.trim()) {
      setNewSiteMessage("現場名を入力してください");
      return;
    }
    setNewSiteSaving(true);
    setNewSiteMessage("");
    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSiteDraft),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "現場を追加できませんでした");
      setSiteMasters((current) => [...current, data.site]);
      setNewSiteDraft({ site: "", location: "", address: "", coordinates: "" });
      setShowNewSite(false);
      setNewSiteMessage(`「${data.site.site}」を追加しました`);
    } catch (error) {
      setNewSiteMessage(
        error instanceof Error ? error.message : "現場を追加できませんでした",
      );
    } finally {
      setNewSiteSaving(false);
    }
  }

  function useCurrentLocationForNewSite() {
    if (!navigator.geolocation) {
      setNewSiteMessage("この端末では現在地を取得できません");
      return;
    }
    setNewSiteMessage("現在地を取得しています…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        const address = await addressFromCoordinates(coordinates);
        setNewSiteDraft((current) => ({
          ...current,
          address: address || current.address,
          coordinates,
        }));
        setNewSiteMessage(
          address
            ? "現在地から住所を入力しました"
            : "緯度・経度を入力しました。住所は取得できなかったため確認してください",
        );
      },
      () =>
        setNewSiteMessage(
          "現在地を取得できませんでした。位置情報の許可を確認してください",
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function updateSiteMaster(
    card: SiteCardData,
    values: Pick<SiteMaster, "site" | "location" | "address" | "coordinates">,
  ) {
    if (!card.masterId) return;
    const response = await fetch("/api/sites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.masterId, ...values }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "現場情報を更新できませんでした");
    setSiteMasters((current) =>
      current.map((site) => (site.id === card.masterId ? data.site : site)),
    );
  }

  async function registerPlannedSites(entry: Entry) {
    const rows = [
      ...new Map(
        entrySiteRows(entry)
          .filter((row) => row.site)
          .map((row) => [siteCardKey(row), row] as const),
      ).values(),
    ];
    for (const row of rows) {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upsert", ...row }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "現場一覧へ登録できませんでした");
      setSiteMasters((current) => {
        const exists = current.some((site) => site.id === data.site.id);
        return exists
          ? current.map((site) =>
              site.id === data.site.id ? data.site : site,
            )
          : [...current, data.site];
      });
    }
  }

  function openSiteNameEditor(card: SiteCardData) {
    const key = siteCardKey(card);
    if (editingSiteNameKey === key) {
      setEditingSiteNameKey(null);
      return;
    }
    setEditingSiteNameKey(key);
    setSiteNameDraft(card.site);
    setSiteNameMessage("");
  }

  async function loadSiteDocuments(siteKey: string, force = false) {
    if (!force && siteDocumentsByKey[siteKey]) return;
    setSiteDocumentLoadingKey(siteKey);
    try {
      const response = await fetch(
        `/api/site-documents?siteKey=${encodeURIComponent(siteKey)}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "現場資料を読み込めませんでした");
      setSiteDocumentsByKey((current) => ({
        ...current,
        [siteKey]: data.documents,
      }));
      setSiteDocumentCounts((current) => ({
        ...(current ?? {}),
        [siteKey]: data.documents.length,
      }));
      setSiteDocumentMessages((current) => ({ ...current, [siteKey]: "" }));
    } catch (error) {
      setSiteDocumentMessages((current) => ({
        ...current,
        [siteKey]:
          error instanceof Error
            ? error.message
            : "現場資料を読み込めませんでした",
      }));
    } finally {
      setSiteDocumentLoadingKey(null);
    }
  }

  async function uploadSiteDocuments(
    card: SiteCardData,
    files: FileList | null,
  ) {
    if (!files?.length) return;
    const siteKey = siteCardKey(card);
    const selectedFiles = [...files].slice(0, 10);
    setSiteDocumentUploadingKey(siteKey);
    setSiteDocumentMessages((current) => ({
      ...current,
      [siteKey]: "資料を保存しています…",
    }));
    try {
      const uploaded: SiteDocument[] = [];
      for (const file of selectedFiles) {
        const query = new URLSearchParams({
          siteKey,
          fileName: file.name || "名称未設定",
        });
        const response = await fetch(`/api/site-documents?${query}`, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || `「${file.name}」を保存できませんでした`,
          );
        uploaded.push(data.document);
      }
      setSiteDocumentsByKey((current) => ({
        ...current,
        [siteKey]: [...(current[siteKey] ?? []), ...uploaded],
      }));
      setSiteDocumentCounts((current) => ({
        ...(current ?? {}),
        [siteKey]: (current?.[siteKey] ?? 0) + uploaded.length,
      }));
      setSiteDocumentMessages((current) => ({
        ...current,
        [siteKey]: `${uploaded.length}件の資料を保存しました`,
      }));
    } catch (error) {
      setSiteDocumentMessages((current) => ({
        ...current,
        [siteKey]:
          error instanceof Error ? error.message : "資料を保存できませんでした",
      }));
    } finally {
      setSiteDocumentUploadingKey(null);
    }
  }

  async function deleteSiteDocument(
    card: SiteCardData,
    document: SiteDocument,
  ) {
    if (!window.confirm(`「${document.fileName}」を削除しますか？`)) return;
    const siteKey = siteCardKey(card);
    try {
      const response = await fetch("/api/site-documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: document.id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "資料を削除できませんでした");
      setSiteDocumentsByKey((current) => ({
        ...current,
        [siteKey]: (current[siteKey] ?? []).filter(
          (item) => item.id !== document.id,
        ),
      }));
      setSiteDocumentCounts((current) => ({
        ...(current ?? {}),
        [siteKey]: Math.max(0, (current?.[siteKey] ?? 0) - 1),
      }));
      setSiteDocumentMessages((current) => ({
        ...current,
        [siteKey]: "資料を削除しました",
      }));
    } catch (error) {
      setSiteDocumentMessages((current) => ({
        ...current,
        [siteKey]:
          error instanceof Error ? error.message : "資料を削除できませんでした",
      }));
    }
  }

  async function moveSiteDocumentKey(oldSiteKey: string, newSiteKey: string) {
    if (oldSiteKey === newSiteKey) return;
    const response = await fetch("/api/site-documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldSiteKey, newSiteKey }),
    });
    if (!response.ok) return;
    setSiteDocumentsByKey((current) => {
      const next = { ...current };
      if (next[oldSiteKey])
        next[newSiteKey] = next[oldSiteKey].map((document) => ({
          ...document,
          siteKey: newSiteKey,
        }));
      delete next[oldSiteKey];
      return next;
    });
    setSiteDocumentCounts((current) => {
      if (!current) return current;
      const next = { ...current };
      if (oldSiteKey in next) next[newSiteKey] = next[oldSiteKey];
      delete next[oldSiteKey];
      return next;
    });
  }

  async function saveSiteName(card: SiteCardData) {
    const nextName = siteNameDraft.trim();
    if (!nextName) {
      setSiteNameMessage("新しい現場名を入力してください");
      return;
    }
    if (nextName === card.site.trim()) {
      setEditingSiteNameKey(null);
      return;
    }
    if (
      !window.confirm(
        `「${card.site || "現場名不明"}」を「${nextName}」へ変更します。\n過去の勤務記録・Googleカレンダー・スプレッドシートにも反映します。`,
      )
    )
      return;
    setSiteNameSaving(true);
    setSiteNameMessage("同じ現場の過去記録へ反映しています…");
    const updatedEntries = new Map<string, Entry>();
    let failed = 0;
    for (const entry of entries) {
      const rows = indexedEntrySiteRows(entry);
      const matchingIndices = rows
        .filter((row) => siteCardKey(row) === siteCardKey(card))
        .map((row) => row.index);
      if (!matchingIndices.length) continue;
      const sites = entry.site ? entry.site.split(SITE_SEPARATOR) : [];
      while (sites.length < rows.length) sites.push("");
      matchingIndices.forEach((index) => {
        sites[index] = nextName;
      });
      try {
        const response = await fetch("/api/entries", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...entry,
            id: Number(entry.id),
            site: sites.join(SITE_SEPARATOR),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "保存できませんでした");
        updatedEntries.set(entry.id, data.entry);
      } catch {
        failed += 1;
      }
    }
    try {
      await updateSiteMaster(card, {
        site: nextName,
        location: card.location,
        address: card.address,
        coordinates: card.coordinates,
      });
    } catch {
      failed += 1;
    }
    setEntries((current) =>
      current.map((entry) => updatedEntries.get(entry.id) ?? entry),
    );
    if (!failed)
      await moveSiteDocumentKey(
        siteCardKey(card),
        siteCardKey({ ...card, site: nextName }),
      );
    setSiteNameSaving(false);
    if (failed)
      setSiteNameMessage(
        `${updatedEntries.size}件を変更しました（${failed}件は変更できませんでした）`,
      );
    else {
      setEditingSiteNameKey(null);
      setSiteNameMessage(
        `${updatedEntries.size}件の記録を「${nextName}」へ変更しました`,
      );
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setSiteLocationMessage("この端末では現在地を取得できません");
      return;
    }
    setSiteLocationMessage("現在地を取得しています…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        const address = await addressFromCoordinates(coordinates);
        setSiteLocationDraft((current) => ({
          ...current,
          address: address || current.address,
          coordinates,
        }));
        setSiteLocationMessage(
          address
            ? "現在地から住所を入力しました"
            : "緯度・経度を入力しました。住所は取得できなかったため確認してください",
        );
      },
      () =>
        setSiteLocationMessage(
          "現在地を取得できませんでした。位置情報の許可を確認してください",
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function saveSiteLocation(card: SiteCardData) {
    if (
      !siteLocationDraft.location.trim() &&
      !siteLocationDraft.address.trim() &&
      !siteLocationDraft.coordinates.trim()
    ) {
      setSiteLocationMessage(
        "地域・住所・緯度経度のいずれかを入力してください",
      );
      return;
    }
    setSiteLocationSaving(true);
    setSiteLocationMessage("同じ現場の記録へ反映しています…");
    const updatedEntries = new Map<string, Entry>();
    let failed = 0;
    for (const entry of entries) {
      const rows = indexedEntrySiteRows(entry);
      const matchingIndices = rows
        .filter((row) => siteCardKey(row) === siteCardKey(card))
        .map((row) => row.index);
      if (!matchingIndices.length) continue;
      const addresses = entry.address
        ? entry.address.split(SITE_SEPARATOR)
        : [];
      const coordinates = entry.coordinates
        ? entry.coordinates.split(SITE_SEPARATOR)
        : [];
      const locations = entry.location
        ? entry.location.split(SITE_SEPARATOR)
        : [];
      while (addresses.length < rows.length) addresses.push("");
      while (coordinates.length < rows.length) coordinates.push("");
      while (locations.length < rows.length) locations.push("");
      matchingIndices.forEach((index) => {
        locations[index] = siteLocationDraft.location.trim();
        addresses[index] = siteLocationDraft.address.trim();
        coordinates[index] = siteLocationDraft.coordinates.trim();
      });
      try {
        const response = await fetch("/api/entries", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...entry,
            id: Number(entry.id),
            location: locations.join(SITE_SEPARATOR),
            address: addresses.join(SITE_SEPARATOR),
            coordinates: coordinates.join(SITE_SEPARATOR),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "保存できませんでした");
        updatedEntries.set(entry.id, data.entry);
      } catch {
        failed += 1;
      }
    }
    try {
      await updateSiteMaster(card, {
        site: card.site,
        location: siteLocationDraft.location.trim(),
        address: siteLocationDraft.address.trim(),
        coordinates: siteLocationDraft.coordinates.trim(),
      });
    } catch {
      failed += 1;
    }
    setEntries((current) =>
      current.map((entry) => updatedEntries.get(entry.id) ?? entry),
    );
    if (!failed)
      await moveSiteDocumentKey(
        siteCardKey(card),
        siteCardKey({
          ...card,
          location: siteLocationDraft.location.trim(),
          address: siteLocationDraft.address.trim(),
          coordinates: siteLocationDraft.coordinates.trim(),
        }),
      );
    setSiteLocationSaving(false);
    if (failed) {
      setSiteLocationMessage(
        `${updatedEntries.size}件を更新しました（${failed}件は更新できませんでした）`,
      );
    } else {
      setEditingSiteLocationKey(null);
      setSiteLocationMessage(
        `${updatedEntries.size}件の記録へ位置情報を反映しました`,
      );
    }
  }

  function edit(entry: Entry) {
    const { id, ...values } = entry;
    setForm(values);
    setOffEndDate(entry.date);
    setEditingId(id);
    setActiveTab("entry");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    await removeMany([id]);
    if (editingId === id) cancelEdit();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyEntry());
    setOffEndDate(today());
  }

  function toggleWork(index: number, value: string) {
    const selected = formWorks[index].split("・").filter(Boolean);
    let nextSelected =
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
    if (
      !nextSelected.some((item) => GARBAGE_DISPOSAL_TRIGGERS.includes(item))
    )
      nextSelected = nextSelected.filter(
        (item) => item !== GARBAGE_DISPOSAL_OPTION,
      );
    const workForSite = nextSelected.join("・");
    const next = [...formWorks];
    next[index] = workForSite;
    setForm({ ...form, work: next.join(SITE_SEPARATOR) });
  }

  function updateSite(index: number, value: string) {
    const next = [...formSites];
    next[index] = value;
    setForm({ ...form, site: next.join(SITE_SEPARATOR) });
  }

  function updateLocation(index: number, value: string) {
    const next = [...formLocations];
    next[index] = value;
    setForm({ ...form, location: next.join(SITE_SEPARATOR) });
  }

  function updatePosition(index: number, value: string) {
    const { address, coordinates } = parsePositionInput(value);
    const nextAddresses = [...formAddresses];
    const nextCoordinates = [...formCoordinates];
    nextAddresses[index] = address;
    nextCoordinates[index] = coordinates;
    setForm({
      ...form,
      address: nextAddresses.join(SITE_SEPARATOR),
      coordinates: nextCoordinates.join(SITE_SEPARATOR),
    });
  }

  function getCurrentAddress(index: number) {
    if (!navigator.geolocation) {
      setLocationLookupMessages((current) => ({
        ...current,
        [index]: "この端末では現在地を取得できません",
      }));
      return;
    }
    setLocatingSiteIndex(index);
    setLocationLookupMessages((current) => ({
      ...current,
      [index]: "現在地と住所を取得しています…",
    }));
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        const key = `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
        let address = "";
        try {
          const response = await fetch("/api/regions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coordinates: [coordinates] }),
          });
          const data = (await response.json()) as {
            addresses?: Record<string, string>;
          };
          if (response.ok) address = data.addresses?.[key] ?? "";
        } catch {}
        setForm((current) => {
          const addresses = current.address
            ? current.address.split(SITE_SEPARATOR)
            : [];
          const coordinateValues = current.coordinates
            ? current.coordinates.split(SITE_SEPARATOR)
            : [];
          while (addresses.length <= index) addresses.push("");
          while (coordinateValues.length <= index) coordinateValues.push("");
          if (address) addresses[index] = address;
          coordinateValues[index] = coordinates;
          return {
            ...current,
            address: addresses.join(SITE_SEPARATOR),
            coordinates: coordinateValues.join(SITE_SEPARATOR),
          };
        });
        setLocationLookupMessages((current) => ({
          ...current,
          [index]: address
            ? "現在地から住所を入力しました"
            : "緯度・経度を入力しました。住所は取得できなかったため確認してください",
        }));
        setLocatingSiteIndex(null);
      },
      (positionError) => {
        const denied = positionError.code === positionError.PERMISSION_DENIED;
        setLocationLookupMessages((current) => ({
          ...current,
          [index]: denied
            ? "位置情報が許可されていません。iPhoneの設定から許可してください"
            : "現在地を取得できませんでした。電波状況を確認してください",
        }));
        setLocatingSiteIndex(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  function updatePersonnelNames(index: number, value: string) {
    const next = [...formPersonnelNames];
    next[index] = value;
    setForm({ ...form, personnelNames: next.join(SITE_SEPARATOR) });
  }

  function updateStart(index: number, value: string) {
    const next = [...formStarts];
    next[index] = value;
    setForm({ ...form, start: next.join(SITE_SEPARATOR) });
  }

  function updateEnd(index: number, value: string) {
    const next = [...formEnds];
    next[index] = value;
    setForm({ ...form, end: next.join(SITE_SEPARATOR) });
  }

  function updateNote(index: number, value: string) {
    const next = [...formNotes];
    next[index] = value;
    setForm({ ...form, note: next.join(SITE_SEPARATOR) });
  }

  function togglePersonnelName(index: number, name: string) {
    const selected = splitNames(formPersonnelNames[index]);
    updatePersonnelNames(
      index,
      (selected.includes(name)
        ? selected.filter((item) => item !== name)
        : [...selected, name]
      ).join("、"),
    );
  }

  function addSite() {
    if (formSites.length < 5)
      setForm({
        ...form,
        site: [...formSites, ""].join(SITE_SEPARATOR),
        location: [...formLocations, ""].join(SITE_SEPARATOR),
        address: [...formAddresses, ""].join(SITE_SEPARATOR),
        coordinates: [...formCoordinates, ""].join(SITE_SEPARATOR),
        personnelNames: [...formPersonnelNames, ""].join(SITE_SEPARATOR),
        work: [...formWorks, ""].join(SITE_SEPARATOR),
        note: [...formNotes, ""].join(SITE_SEPARATOR),
        start: [...formStarts, formEnds[formEnds.length - 1] || "08:00"].join(
          SITE_SEPARATOR,
        ),
        end: [...formEnds, "17:00"].join(SITE_SEPARATOR),
      });
  }

  function removeSite(index: number) {
    const next = formSites.filter((_, siteIndex) => siteIndex !== index);
    const nextLocations = formLocations.filter(
      (_, siteIndex) => siteIndex !== index,
    );
    const nextAddresses = formAddresses.filter(
      (_, siteIndex) => siteIndex !== index,
    );
    const nextCoordinates = formCoordinates.filter(
      (_, siteIndex) => siteIndex !== index,
    );
    const nextNames = formPersonnelNames.filter(
      (_, siteIndex) => siteIndex !== index,
    );
    const nextWorks = formWorks.filter((_, siteIndex) => siteIndex !== index);
    const nextStarts = formStarts.filter((_, siteIndex) => siteIndex !== index);
    const nextEnds = formEnds.filter((_, siteIndex) => siteIndex !== index);
    const nextNotes = formNotes.filter((_, siteIndex) => siteIndex !== index);
    setForm({
      ...form,
      site: (next.length ? next : [""]).join(SITE_SEPARATOR),
      location: (nextLocations.length ? nextLocations : [""]).join(
        SITE_SEPARATOR,
      ),
      address: (nextAddresses.length ? nextAddresses : [""]).join(
        SITE_SEPARATOR,
      ),
      coordinates: (nextCoordinates.length ? nextCoordinates : [""]).join(
        SITE_SEPARATOR,
      ),
      personnelNames: (nextNames.length ? nextNames : [""]).join(
        SITE_SEPARATOR,
      ),
      work: (nextWorks.length ? nextWorks : [""]).join(SITE_SEPARATOR),
      note: (nextNotes.length ? nextNotes : [""]).join(SITE_SEPARATOR),
      start: (nextStarts.length ? nextStarts : ["08:00"]).join(SITE_SEPARATOR),
      end: (nextEnds.length ? nextEnds : ["17:00"]).join(SITE_SEPARATOR),
    });
  }

  async function loadTools() {
    setToolsReady(false);
    setToolMessage("");
    try {
      const response = await fetch(`/api/tools?date=${today()}`);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "道具一覧を読み込めませんでした");
      setToolSets(data.sets);
    } catch (error) {
      setToolMessage(
        error instanceof Error
          ? error.message
          : "道具一覧を読み込めませんでした",
      );
    } finally {
      setToolsReady(true);
    }
  }

  async function addToolSet() {
    const name = newToolSetName.trim();
    if (!name) {
      setToolMessage("追加するセット名を入力してください");
      return;
    }
    try {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_set",
          category: toolCategory,
          name,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "セットを追加できませんでした");
      setToolSets((current) => [...current, data.set]);
      setNewToolSetName("");
      setToolMessage(`「${name}」を追加しました`);
    } catch (error) {
      setToolMessage(
        error instanceof Error ? error.message : "セットを追加できませんでした",
      );
    }
  }

  async function addToolItem(setId: number) {
    const name = (newToolNames[setId] ?? "").trim();
    if (!name) {
      setToolMessage("追加する道具名を入力してください");
      return;
    }
    try {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_item", setId, name }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "道具を追加できませんでした");
      setToolSets((current) =>
        current.map((set) =>
          set.id === setId ? { ...set, items: [...set.items, data.item] } : set,
        ),
      );
      setNewToolNames((current) => ({ ...current, [setId]: "" }));
      setToolMessage(`「${name}」を追加しました`);
    } catch (error) {
      setToolMessage(
        error instanceof Error ? error.message : "道具を追加できませんでした",
      );
    }
  }

  async function toggleTool(item: ToolChecklistItem) {
    const checked = !item.checked;
    setToolSets((current) =>
      current.map((set) => ({
        ...set,
        items: set.items.map((tool) =>
          tool.id === item.id ? { ...tool, checked } : tool,
        ),
      })),
    );
    try {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle",
          itemId: item.id,
          date: today(),
          checked,
        }),
      });
      if (!response.ok) throw new Error("チェックを保存できませんでした");
    } catch (error) {
      setToolSets((current) =>
        current.map((set) => ({
          ...set,
          items: set.items.map((tool) =>
            tool.id === item.id ? { ...tool, checked: item.checked } : tool,
          ),
        })),
      );
      setToolMessage(
        error instanceof Error
          ? error.message
          : "チェックを保存できませんでした",
      );
    }
  }

  function moveToolLocally(
    type: "set" | "item",
    setId: number,
    id: number,
    direction: -1 | 1,
  ) {
    const current = toolSetsRef.current;
    const source =
      type === "set"
        ? current.filter((set) => set.category === toolCategory)
        : (current.find((set) => set.id === setId)?.items ?? []);
    const index = source.findIndex((entry) => entry.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= source.length)
      return false;
    const reordered = [...source];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    let next: ToolChecklistSet[];
    if (type === "set") {
      let categoryIndex = 0;
      next = current.map((set) =>
        set.category === toolCategory
          ? { ...reordered[categoryIndex], sortOrder: categoryIndex++ }
          : set,
      );
    } else {
      next = current.map((set) =>
        set.id === setId
          ? {
              ...set,
              items: reordered.map((item, order) => ({
                ...item,
                sortOrder: order,
              })),
            }
          : set,
      );
    }
    toolSetsRef.current = next;
    setToolSets(next);
    return true;
  }

  async function saveToolOrder(type: "set" | "item", setId: number) {
    const orderedIds =
      type === "set"
        ? toolSetsRef.current
            .filter((set) => set.category === toolCategory)
            .map((set) => set.id)
        : (toolSetsRef.current
            .find((set) => set.id === setId)
            ?.items.map((item) => item.id) ?? []);
    try {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          reorderType: type,
          category: toolCategory,
          setId,
          orderedIds,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "並び順を保存できませんでした");
      setToolMessage("並び順を保存しました");
    } catch (error) {
      setToolMessage(
        error instanceof Error ? error.message : "並び順を保存できませんでした",
      );
      void loadTools();
    }
  }

  function beginToolDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    type: "set" | "item",
    setId: number,
    id: number,
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const drag: ToolDragState = {
      type,
      setId,
      id,
      pointerId: event.pointerId,
      lastY: event.clientY,
      active: false,
      timer: 0,
    };
    drag.timer = window.setTimeout(() => {
      drag.active = true;
      setToolDraggingKey(`${type}:${id}`);
      setToolMessage("そのまま上下に動かしてください");
      if (navigator.vibrate) navigator.vibrate(15);
    }, 350);
    toolDragRef.current = drag;
  }

  function moveToolDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = toolDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.active) return;
    event.preventDefault();
    const threshold = drag.type === "set" ? 54 : 38;
    const delta = event.clientY - drag.lastY;
    if (Math.abs(delta) < threshold) return;
    const direction = delta > 0 ? 1 : -1;
    if (moveToolLocally(drag.type, drag.setId, drag.id, direction))
      drag.lastY += direction * threshold;
    else drag.lastY = event.clientY;
  }

  function finishToolDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = toolDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    window.clearTimeout(drag.timer);
    if (drag.active) void saveToolOrder(drag.type, drag.setId);
    setToolDraggingKey(null);
    toolDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function resetToolChecks() {
    const itemIds = visibleToolItems.map((item) => item.id);
    if (
      !itemIds.length ||
      !window.confirm(`${toolCategory}の今日のチェックをすべて外しますか？`)
    )
      return;
    try {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", date: today(), itemIds }),
      });
      if (!response.ok) throw new Error("チェックをリセットできませんでした");
      const ids = new Set(itemIds);
      setToolSets((current) =>
        current.map((set) => ({
          ...set,
          items: set.items.map((item) =>
            ids.has(item.id) ? { ...item, checked: false } : item,
          ),
        })),
      );
      setToolMessage("今日のチェックをリセットしました");
    } catch (error) {
      setToolMessage(
        error instanceof Error
          ? error.message
          : "チェックをリセットできませんでした",
      );
    }
  }

  async function saveMasterOption(
    type: "work" | "person",
    option?: MasterOption,
  ) {
    const proposed = option
      ? window.prompt("新しい名前を入力してください", option.name)
      : masterDrafts[type];
    const name = proposed?.trim();
    if (!name) return;
    if (
      type === "work" &&
      (FIXED_WORK_OPTIONS.includes(name) || name === GARBAGE_DISPOSAL_OPTION)
    ) {
      setMasterMessage(`「${name}」は固定項目に登録されています`);
      return;
    }
    try {
      const response = await fetch("/api/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: option ? "edit" : "add",
          type,
          id: option?.id,
          name,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存できませんでした");
      setMasterOptions((current) => ({
        ...current,
        [type]: option
          ? current[type].map((item) =>
              item.id === option.id ? data.option : item,
            )
          : current[type].some((item) => item.id === data.option.id)
            ? current[type].map((item) =>
                item.id === data.option.id ? data.option : item,
              )
            : [...current[type], data.option],
      }));
      if (!option) setMasterDrafts((current) => ({ ...current, [type]: "" }));
      setMasterMessage(`「${name}」を保存しました`);
    } catch (error) {
      setMasterMessage(
        error instanceof Error ? error.message : "保存できませんでした",
      );
    }
  }

  function moveFixedWork(name: string, direction: -1 | 1) {
    setFixedWorkOrder((current) => {
      const index = current.indexOf(name);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      localStorage.setItem("fixed-work-order-v1", JSON.stringify(next));
      return next;
    });
  }

  async function toggleMasterArchive(
    type: "work" | "person",
    option: MasterOption,
  ) {
    const action = option.archivedAt ? "restore" : "archive";
    if (
      !option.archivedAt &&
      !window.confirm(
        `「${option.name}」を今後の入力候補から非表示にしますか？\n過去の勤務記録には残ります。`,
      )
    )
      return;
    try {
      const response = await fetch("/api/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, type, id: option.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "更新できませんでした");
      setMasterOptions((current) => ({
        ...current,
        [type]: current[type].map((item) =>
          item.id === option.id ? data.option : item,
        ),
      }));
      setMasterMessage(
        action === "restore"
          ? `「${option.name}」を候補へ戻しました`
          : `「${option.name}」を非表示にしました`,
      );
    } catch (error) {
      setMasterMessage(
        error instanceof Error ? error.message : "更新できませんでした",
      );
    }
  }

  async function editTool(
    type: "set" | "item",
    id: number,
    currentName: string,
  ) {
    const name = window
      .prompt("新しい名前を入力してください", currentName)
      ?.trim();
    if (!name || name === currentName) return;
    try {
      const response = await fetch("/api/tools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "編集できませんでした");
      setToolSets((current) =>
        current.map((set) =>
          type === "set" && set.id === id
            ? { ...set, name }
            : {
                ...set,
                items: set.items.map((item) =>
                  type === "item" && item.id === id ? { ...item, name } : item,
                ),
              },
        ),
      );
      setToolMessage(`「${currentName}」を「${name}」へ変更しました`);
    } catch (error) {
      setToolMessage(
        error instanceof Error ? error.message : "編集できませんでした",
      );
    }
  }

  async function archiveSite(card: SiteCardData) {
    if (!card.masterId) return;
    if (
      !window.confirm(
        `「${card.site || "現場名不明"}」を現場一覧から非表示にしますか？\n勤務記録・予定・資料は削除されません。`,
      )
    )
      return;
    try {
      const response = await fetch("/api/sites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.masterId, action: "archive" }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "非表示にできませんでした");
      setSiteMasters((current) =>
        current.map((site) => (site.id === card.masterId ? data.site : site)),
      );
      setSiteNameMessage(
        `「${card.site}」を非表示にしました。設定から復元できます`,
      );
    } catch (error) {
      setSiteNameMessage(
        error instanceof Error ? error.message : "非表示にできませんでした",
      );
    }
  }

  async function restoreSite(master: SiteMaster) {
    const response = await fetch("/api/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: master.id, action: "restore" }),
    });
    const data = await response.json();
    if (response.ok) {
      setSiteMasters((current) =>
        current.map((site) => (site.id === master.id ? data.site : site)),
      );
      setMasterMessage(`「${master.site}」を現場一覧へ戻しました`);
    } else setMasterMessage(data.error || "復元できませんでした");
  }

  async function deleteTool(type: "set" | "item", id: number, name: string) {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    try {
      const response = await fetch("/api/tools", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      if (!response.ok) throw new Error("削除できませんでした");
      setToolSets((current) =>
        type === "set"
          ? current.filter((set) => set.id !== id)
          : current.map((set) => ({
              ...set,
              items: set.items.filter((item) => item.id !== id),
            })),
      );
      setToolMessage(
        `「${name}」を非表示にしました（過去のチェック履歴は残ります）`,
      );
    } catch (error) {
      setToolMessage(
        error instanceof Error ? error.message : "削除できませんでした",
      );
    }
  }

  const needsTime = ["1日", "半日"].includes(form.type);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <img src="/sakaguchi-icon.png" alt="坂口商会" />
          </span>
          <div>
            <div className="brand-title">
              <strong>坂口商会総合管理システム</strong>
              <span className="app-version">v{APP_VERSION}</span>
            </div>
            <small>勤怠・現場・道具を一元管理</small>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`calendar-connect ${googleConnection.connected ? "connected" : ""}`}
            type="button"
            onClick={() => setActiveTab("settings")}
          >
            {googleConnection.connected ? "Google連携中" : "Google連携"}
          </button>
          <div className="today">
            {new Intl.DateTimeFormat("ja-JP", {
              timeZone: "Asia/Tokyo",
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
            }).format(new Date())}
          </div>
        </div>
      </header>

      <div className="shell">
        <nav className="app-tabs" aria-label="画面の切り替え">
          {(
            [
              ["entry", "＋", "入力"],
              ["history", "◷", "勤務記録"],
              ["plans", "▣", "予定"],
              ["summary", "▥", "集計"],
              ["sites", "⌂", "現場一覧"],
              ["tools", "✓", "道具チェック"],
              ["shiftboard", "▤", "シフトボード"],
              ["settings", "⚙", "設定"],
            ] as [AppTab, string, string][]
          ).map(([tab, icon, label]) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "active" : ""}
              aria-current={activeTab === tab ? "page" : undefined}
              onClick={() => setActiveTab(tab)}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        {activeTab === "settings" && (
          <section className="google-oauth-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">GOOGLE ACCOUNT</span>
                <h2>Googleアカウント連携</h2>
                <p>
                  Apps
                  Scriptを使わず、カレンダー・スプレッドシート・ドライブへ接続します。
                </p>
              </div>
              <span
                className={`google-status ${googleConnection.connected ? "connected" : ""}`}
              >
                {googleConnection.connected
                  ? "連携済み"
                  : googleConnection.configured
                    ? "接続待ち"
                    : "未設定"}
              </span>
            </div>
            {googleConnection.connected ? (
              <div className="google-connected-panel">
                <div>
                  <strong>{googleConnection.name || "Googleアカウント"}</strong>
                  <span>{googleConnection.email}</span>
                  <small>
                    勤務記録はカレンダーとスプレッドシートへ、現場資料はGoogleドライブへ保存されます。
                  </small>
                </div>
                <div className="google-connected-actions">
                  <button
                    className="primary"
                    type="button"
                    disabled={googleSyncing}
                    onClick={syncExistingEntries}
                  >
                    {googleSyncing ? "反映中…" : "過去の記録を全件反映"}
                  </button>
                  {(spreadsheetUrl || googleConnection.spreadsheetUrl) && (
                    <a
                      href={spreadsheetUrl || googleConnection.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      スプレッドシートを開く
                    </a>
                  )}
                  <button type="button" onClick={disconnectGoogleAccount}>
                    連携を解除
                  </button>
                </div>
              </div>
            ) : (
              <div className="google-credential-form">
                <label>
                  <span>クライアントID</span>
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="〜.apps.googleusercontent.com"
                    value={googleClientId}
                    onChange={(event) => setGoogleClientId(event.target.value)}
                  />
                </label>
                <label>
                  <span>クライアントシークレット</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder={
                      googleConnection.configured
                        ? "変更するときだけ入力"
                        : "Google Cloudで発行された値"
                    }
                    value={googleClientSecret}
                    onChange={(event) =>
                      setGoogleClientSecret(event.target.value)
                    }
                  />
                </label>
                <p className="google-secret-note">
                  シークレットは暗号化して保存し、保存後は画面に表示しません。
                </p>
                <div className="google-oauth-actions">
                  <button
                    className="primary"
                    type="button"
                    onClick={saveGoogleConnectionSettings}
                  >
                    IDとシークレットを保存
                  </button>
                  {googleConnection.configured && (
                    <a href="/api/google/start">Googleアカウントを連携</a>
                  )}
                </div>
              </div>
            )}
            {googleConnectionMessage && (
              <p className="calendar-message">{googleConnectionMessage}</p>
            )}
          </section>
        )}
        {activeTab === "settings" && googleConnection.connected && (
          <section className="sync-manager-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">GOOGLE TWO-WAY SYNC</span>
                <h2>Google同期管理</h2>
                <p>
                  勤務記録・予定とGoogleカレンダーの登録、変更、削除を双方向で合わせます。
                </p>
              </div>
              <span className="sync-live">● 双方向同期オン</span>
            </div>
            {!syncDashboard ? (
              <p className="sync-loading">同期状態を確認しています…</p>
            ) : (
              <>
                <div className="sync-stat-grid">
                  <article>
                    <small>同期済み</small>
                    <strong>{syncDashboard.synced}件</strong>
                  </article>
                  <article>
                    <small>未同期</small>
                    <strong>{syncDashboard.pending}件</strong>
                  </article>
                  <article
                    className={syncDashboard.errors.length ? "warning" : ""}
                  >
                    <small>エラー</small>
                    <strong>{syncDashboard.errors.length}件</strong>
                  </article>
                  <article
                    className={syncDashboard.duplicates.length ? "warning" : ""}
                  >
                    <small>重複候補</small>
                    <strong>
                      {syncDashboard.duplicates.reduce(
                        (sum, group) => sum + group.duplicateEventIds.length,
                        0,
                      )}
                      件
                    </strong>
                  </article>
                </div>
                <div className="sync-manager-actions">
                  <button
                    className="primary"
                    type="button"
                    disabled={googleSyncing}
                    onClick={() => reconcileGoogle(true)}
                  >
                    {googleSyncing ? "照合中…" : "Googleと整合性を確認"}
                  </button>
                  {syncDashboard.errors.length > 0 && (
                    <button
                      type="button"
                      disabled={googleSyncing}
                      onClick={() =>
                        retrySync(syncDashboard.errors.map((item) => item.id))
                      }
                    >
                      エラーだけ再実行
                    </button>
                  )}
                  <small>
                    最終同期：
                    {syncDashboard.lastSyncAt
                      ? new Date(syncDashboard.lastSyncAt).toLocaleString(
                          "ja-JP",
                        )
                      : "未実行"}
                  </small>
                </div>
                {syncDashboard.errors.length > 0 && (
                  <details className="sync-detail" open>
                    <summary>
                      同期エラー <span>{syncDashboard.errors.length}件</span>
                    </summary>
                    <div>
                      {syncDashboard.errors.map((item) => (
                        <article key={item.id}>
                          <div>
                            <strong>
                              {formatDate(item.date)}　
                              {item.site || "現場未入力"}
                            </strong>
                            <small>{item.error}</small>
                          </div>
                          <button
                            type="button"
                            onClick={() => retrySync([item.id])}
                          >
                            再実行
                          </button>
                        </article>
                      ))}
                    </div>
                  </details>
                )}
                {syncDashboard.duplicates.length > 0 && (
                  <details className="sync-detail" open>
                    <summary>
                      重複予定の整理{" "}
                      <span>{selectedDuplicateIds.length}件選択</span>
                    </summary>
                    <div>
                      {syncDashboard.duplicates.map((group) =>
                        group.duplicateEventIds.map((eventId) => (
                          <label className="duplicate-row" key={eventId}>
                            <input
                              type="checkbox"
                              checked={selectedDuplicateIds.includes(eventId)}
                              onChange={(event) =>
                                setSelectedDuplicateIds((current) =>
                                  event.target.checked
                                    ? [...current, eventId]
                                    : current.filter((id) => id !== eventId),
                                )
                              }
                            />
                            <span>
                              <strong>{group.summary}</strong>
                              <small>
                                {new Date(group.start).toLocaleString("ja-JP")}
                              </small>
                            </span>
                          </label>
                        )),
                      )}
                    </div>
                    <button
                      className="duplicate-cleanup"
                      type="button"
                      disabled={!selectedDuplicateIds.length || googleSyncing}
                      onClick={cleanupDuplicates}
                    >
                      選択した重複予定を削除
                    </button>
                  </details>
                )}
                <details className="sync-detail">
                  <summary>
                    ごみ箱 <span>{syncDashboard.trash.length}件</span>
                  </summary>
                  <div>
                    {syncDashboard.trash.length ? (
                      syncDashboard.trash.map((item) => (
                        <article key={item.id}>
                          <div>
                            <strong>
                              {formatDate(item.date)}　
                              {item.site || "現場未入力"}
                            </strong>
                            <small>アプリ側で削除・30日間復元可能</small>
                          </div>
                          <button
                            type="button"
                            onClick={() => restoreTrash([item.id])}
                          >
                            復元
                          </button>
                        </article>
                      ))
                    ) : (
                      <p>削除された記録はありません</p>
                    )}
                  </div>
                </details>
              </>
            )}
            {syncManagerMessage && (
              <p className="calendar-message">{syncManagerMessage}</p>
            )}
          </section>
        )}
        {activeTab === "entry" && (
          <section className="entry-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">DAILY RECORD</span>
                <div className="heading-title-line">
                  <h1>
                    {editingId
                      ? formIsPlanned
                        ? "勤務予定を編集"
                        : "勤務記録を編集"
                      : formIsPlanned
                        ? "これからの勤務予定"
                        : "今日の勤務を記録"}
                  </h1>
                  <time dateTime={today()}>{fullDateLabel(today())}</time>
                </div>
              </div>
              {editingId && (
                <button
                  className="text-button"
                  type="button"
                  onClick={cancelEdit}
                >
                  編集をやめる
                </button>
              )}
            </div>

            <form onSubmit={submit}>
              <div
                className={`field-grid top-fields ${form.type === "休み" ? "off-mode" : ""}`}
              >
                {form.type !== "休み" && (
                  <label>
                    <span>日付</span>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => {
                        const date = e.target.value;
                        setForm({
                          ...form,
                          date,
                          dinnerType:
                            date <= today() && form.dinnerType === "未定"
                              ? ""
                              : form.dinnerType,
                        });
                      }}
                    />
                    {formIsPlanned && (
                      <small className="planned-hint">
                        未来の日付のため「予定」として保存します
                      </small>
                    )}
                  </label>
                )}
                <fieldset>
                  <legend>勤務区分</legend>
                  <div className="segmented">
                    {workTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={form.type === type ? "active" : ""}
                        onClick={() => {
                          setForm(
                            type === "休み"
                              ? {
                                  ...form,
                                  type,
                                  start: "",
                                  end: "",
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
                                }
                              : {
                                  ...form,
                                  type,
                                  start: form.start || "08:00",
                                  end: form.end || "17:00",
                                },
                          );
                          if (type === "休み") setOffEndDate(form.date);
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>

              {form.type === "休み" ? (
                <div className="off-entry-panel">
                  <div className="off-date-range">
                    <label>
                      <span>休みの開始日</span>
                      <input
                        type="date"
                        required
                        value={form.date}
                        onChange={(e) => {
                          const date = e.target.value;
                          setForm({ ...form, date });
                          if (offEndDate < date) setOffEndDate(date);
                        }}
                      />
                    </label>
                    <span className="off-range-arrow">〜</span>
                    <label>
                      <span>休みの終了日</span>
                      <input
                        type="date"
                        required
                        min={form.date}
                        value={offEndDate}
                        onChange={(e) => setOffEndDate(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="off-reason">
                    <span>
                      休みの理由 <em>任意</em>
                    </span>
                    <input
                      placeholder="未入力の場合は「休み」になります"
                      value={form.note}
                      onChange={(e) =>
                        setForm({ ...form, note: e.target.value })
                      }
                    />
                  </label>
                  <p>
                    連休の場合は、開始日から終了日までをまとめて休みとして登録します。
                  </p>
                </div>
              ) : (
                <div className="field-grid details">
                  <fieldset className="site-field">
                    <legend>
                      場所・現場情報 <em>最大5か所・履歴から選択可</em>
                    </legend>
                    <datalist id="site-history">
                      {knownSites.map((site) => (
                        <option key={site} value={site} />
                      ))}
                    </datalist>
                    <datalist id="location-history">
                      {knownLocations.map((location) => (
                        <option key={location} value={location} />
                      ))}
                    </datalist>
                    <datalist id="address-history">
                      {knownAddresses.map((address) => (
                        <option key={address} value={address} />
                      ))}
                    </datalist>
                    <datalist id="personnel-history">
                      {knownPersonnelNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                    <div className="site-input-list">
                      {formSites.map((site, index) => {
                        const location = formLocations[index];
                        const address = formAddresses[index];
                        const coordinates = formCoordinates[index];
                        const personnelNames = formPersonnelNames[index];
                        const siteWork = formWorks[index];
                        const start = formStarts[index];
                        const end = formEnds[index];
                        const siteNote = formNotes[index];
                        const selectedNames = splitNames(personnelNames);
                        const selectedWorks = siteWork.split("・").filter(Boolean);
                        const showGarbageDisposal = selectedWorks.some((work) =>
                          GARBAGE_DISPOSAL_TRIGGERS.includes(work),
                        );
                        const previous =
                          previousSiteVisits[
                            `${location.trim()}\u0000${site.trim()}\u0000${address.trim()}\u0000${coordinates.trim()}`
                          ];
                        return (
                          <div className="site-input-row" key={index}>
                            <div className="site-pair-card">
                              <span className="site-number">{index + 1}</span>
                              <div className="site-pair-inputs">
                                <label>
                                  <span>
                                    場所 <em>住所は入力しない</em>
                                  </span>
                                  <input
                                    aria-label={`場所 ${index + 1}`}
                                    list="location-history"
                                    placeholder="例：熊本市・阿蘇"
                                    value={location}
                                    onChange={(e) =>
                                      updateLocation(index, e.target.value)
                                    }
                                  />
                                </label>
                                <label>
                                  <span>
                                    現場名 <em>不明なら空欄でOK</em>
                                  </span>
                                  <input
                                    aria-label={`現場名 ${index + 1}`}
                                    list="site-history"
                                    placeholder="例：〇〇様邸"
                                    value={site}
                                    onChange={(e) =>
                                      updateSite(index, e.target.value)
                                    }
                                  />
                                </label>
                                {needsTime && (
                                  <div className="site-time-fields wide-input">
                                    <label>
                                      <span>この現場の開始時刻</span>
                                      <input
                                        type="time"
                                        required
                                        value={start}
                                        onChange={(e) =>
                                          updateStart(index, e.target.value)
                                        }
                                      />
                                    </label>
                                    <span className="arrow">→</span>
                                    <label>
                                      <span>終了時刻</span>
                                      <input
                                        type="time"
                                        required
                                        value={end}
                                        onChange={(e) =>
                                          updateEnd(index, e.target.value)
                                        }
                                      />
                                    </label>
                                  </div>
                                )}
                                <div className="current-location-action wide-input">
                                  <button
                                    type="button"
                                    onClick={() => getCurrentAddress(index)}
                                    disabled={locatingSiteIndex !== null}
                                  >
                                    {locatingSiteIndex === index
                                      ? "現在地を取得中…"
                                      : "◎ 現在地から住所を取得"}
                                  </button>
                                  {locationLookupMessages[index] && (
                                    <small>
                                      {locationLookupMessages[index]}
                                    </small>
                                  )}
                                </div>
                                <label className="wide-input">
                                  <span>
                                    位置情報{" "}
                                    <em>住所または緯度・経度を入力</em>
                                  </span>
                                  <input
                                    aria-label={`位置情報 ${index + 1}`}
                                    list="address-history"
                                    placeholder="例：熊本県熊本市東区〇〇1-2-3 または 32.8031, 130.7079"
                                    value={positionInputValue(
                                      address,
                                      coordinates,
                                    )}
                                    onChange={(e) =>
                                      updatePosition(index, e.target.value)
                                    }
                                  />
                                </label>
                                {(address.trim() || coordinates.trim()) && (
                                  <a
                                    className="map-link wide-input"
                                    href={mapsUrl(
                                      address,
                                      coordinates,
                                      location,
                                      site,
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Googleマップで確認する ↗
                                  </a>
                                )}
                                <label className="personnel-input">
                                  <span>
                                    作業者名 <em>複数の場合は「、」で区切る</em>
                                  </span>
                                  <input
                                    aria-label={`作業者名 ${index + 1}`}
                                    list="personnel-history"
                                    placeholder="例：田中、佐藤"
                                    value={personnelNames}
                                    onChange={(e) =>
                                      updatePersonnelNames(
                                        index,
                                        e.target.value,
                                      )
                                    }
                                  />
                                </label>
                                {knownPersonnelNames.length > 0 && (
                                  <div className="personnel-options">
                                    <small>過去の名前から選択</small>
                                    <div>
                                      {knownPersonnelNames.map((name) => (
                                        <button
                                          type="button"
                                          key={name}
                                          className={
                                            selectedNames.includes(name)
                                              ? "selected"
                                              : ""
                                          }
                                          onClick={() =>
                                            togglePersonnelName(index, name)
                                          }
                                        >
                                          {selectedNames.includes(name)
                                            ? "✓ "
                                            : ""}
                                          {name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <fieldset className="site-work-field wide-input">
                                  <legend>
                                    この現場の作業内容 <em>複数選択可</em>
                                  </legend>
                                  <div className="work-options">
                                    {knownWorkOptions.map((work) => {
                                      const selected = siteWork
                                        .split("・")
                                        .includes(work);
                                      return (
                                        <button
                                          key={work}
                                          type="button"
                                          aria-pressed={selected}
                                          className={selected ? "selected" : ""}
                                          onClick={() =>
                                            toggleWork(index, work)
                                          }
                                        >
                                          <span className="check">✓</span>
                                          {work}
                                        </button>
                                      );
                                    })}
                                    {showGarbageDisposal && (
                                      <button
                                        type="button"
                                        aria-pressed={selectedWorks.includes(
                                          GARBAGE_DISPOSAL_OPTION,
                                        )}
                                        className={
                                          selectedWorks.includes(
                                            GARBAGE_DISPOSAL_OPTION,
                                          )
                                            ? "selected conditional-work"
                                            : "conditional-work"
                                        }
                                        onClick={() =>
                                          toggleWork(
                                            index,
                                            GARBAGE_DISPOSAL_OPTION,
                                          )
                                        }
                                      >
                                        <span className="check">✓</span>
                                        ゴミ処分
                                      </button>
                                    )}
                                  </div>
                                </fieldset>
                                <label className="wide-input site-note-input">
                                  <span>
                                    この現場のメモ <em>任意</em>
                                  </span>
                                  <textarea
                                    rows={2}
                                    aria-label={`現場メモ ${index + 1}`}
                                    placeholder="雨天、直行直帰、注意点など"
                                    value={siteNote}
                                    onChange={(e) =>
                                      updateNote(index, e.target.value)
                                    }
                                  />
                                </label>
                              </div>
                            </div>
                            {formSites.length > 1 && (
                              <button
                                className="remove-site"
                                type="button"
                                onClick={() => removeSite(index)}
                                aria-label={`${index + 1}番目の場所・現場を削除`}
                              >
                                削除
                              </button>
                            )}
                            {(site.trim() ||
                              location.trim() ||
                              address.trim() ||
                              coordinates.trim()) && (
                              <small
                                className={
                                  previous ? "last-visit found" : "last-visit"
                                }
                              >
                                {previous ? (
                                  <>
                                    前回訪問：
                                    <strong>{formatDate(previous.date)}</strong>
                                    （{elapsedDays(form.date, previous.date)}
                                    日ぶり）
                                  </>
                                ) : (
                                  "この場所・現場は初回です"
                                )}
                              </small>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className="add-site"
                      type="button"
                      onClick={addSite}
                      disabled={formSites.length >= 5}
                    >
                      ＋ 現場を追加（{formSites.length}/5）
                    </button>
                    {needsTime && (
                      <div className="daily-extra-summary">
                        <span>
                          早出{" "}
                          <strong>{formatMinutes(currentExtra.early)}</strong>
                        </span>
                        <span>
                          残業{" "}
                          <strong>
                            {formatMinutes(currentExtra.overtime)}
                          </strong>
                        </span>
                        <small>1日の最初と最後の時刻から30分単位で計算</small>
                      </div>
                    )}
                  </fieldset>
                  <fieldset className="wide trip-field">
                    <legend>出張</legend>
                    <div className="trip-options">
                      <button
                        type="button"
                        className={!form.businessTrip ? "selected" : ""}
                        aria-pressed={!form.businessTrip}
                        onClick={() =>
                          setForm({
                            ...form,
                            businessTrip: false,
                            dinnerType: "",
                            hotelName: "",
                          })
                        }
                      >
                        通常勤務
                      </button>
                      <button
                        type="button"
                        className={form.businessTrip ? "selected" : ""}
                        aria-pressed={form.businessTrip}
                        onClick={() => setForm({ ...form, businessTrip: true })}
                      >
                        出張
                      </button>
                    </div>
                    {form.businessTrip && (
                      <div className="dinner-panel">
                        <span>
                          夜ご飯 <em>必須</em>
                        </span>
                        <div className="dinner-options">
                          <button
                            type="button"
                            className={
                              form.dinnerType === "自費" ? "selected" : ""
                            }
                            aria-pressed={form.dinnerType === "自費"}
                            onClick={() =>
                              setForm({ ...form, dinnerType: "自費" })
                            }
                          >
                            自費で
                          </button>
                          <button
                            type="button"
                            className={
                              form.dinnerType === "社長と食事" ? "selected" : ""
                            }
                            aria-pressed={form.dinnerType === "社長と食事"}
                            onClick={() =>
                              setForm({ ...form, dinnerType: "社長と食事" })
                            }
                          >
                            社長と食べに行った
                          </button>
                          <button
                            type="button"
                            className={
                              form.dinnerType === "なし" ? "selected" : ""
                            }
                            aria-pressed={form.dinnerType === "なし"}
                            onClick={() =>
                              setForm({ ...form, dinnerType: "なし" })
                            }
                          >
                            なし（最終日など）
                          </button>
                          {formIsPlanned && (
                            <button
                              type="button"
                              className={
                                form.dinnerType === "未定" ? "selected" : ""
                              }
                              aria-pressed={form.dinnerType === "未定"}
                              onClick={() =>
                                setForm({ ...form, dinnerType: "未定" })
                              }
                            >
                              未定
                            </button>
                          )}
                        </div>
                        <datalist id="hotel-history">
                          {knownHotels.map((hotel) => (
                            <option key={hotel} value={hotel} />
                          ))}
                        </datalist>
                        <label className="hotel-input">
                          <span>
                            宿泊ホテル <em>任意・過去のホテルから選択可</em>
                          </span>
                          <input
                            list="hotel-history"
                            placeholder="例：〇〇ホテル熊本"
                            value={form.hotelName}
                            onChange={(e) =>
                              setForm({ ...form, hotelName: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    )}
                  </fieldset>
                </div>
              )}
              {error && <p className="error-message">{error}</p>}
              <button
                className={`primary record-submit ${formIsPlanned ? "planned-submit" : ""}`}
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "保存しています…"
                  : form.type === "休み"
                    ? `✓ ${form.date === offEndDate ? "この日を" : "この期間を"}休みとして登録する`
                    : editingId
                      ? formIsPlanned
                        ? "✓ 予定の変更を保存する"
                        : "✓ 変更を保存する"
                      : formIsPlanned
                        ? "✓ この内容で予定を登録する"
                        : "✓ この内容で記録する"}
              </button>
            </form>
          </section>
        )}

        {activeTab === "summary" && (
          <section className="summary-section">
            <div className="section-heading history-heading">
              <div>
                <span className="eyebrow">
                  {summaryPeriod === "annual"
                    ? "ANNUAL SUMMARY"
                    : "MONTHLY SUMMARY"}
                </span>
                <h2>{summaryPeriod === "annual" ? "年間集計" : "月間集計"}</h2>
              </div>
              <div className="monthly-controls">
                <div className="summary-period-switch" aria-label="集計期間">
                  <button
                    type="button"
                    className={summaryPeriod === "monthly" ? "active" : ""}
                    aria-pressed={summaryPeriod === "monthly"}
                    onClick={() => setSummaryPeriod("monthly")}
                  >
                    月間
                  </button>
                  <button
                    type="button"
                    className={summaryPeriod === "annual" ? "active" : ""}
                    aria-pressed={summaryPeriod === "annual"}
                    onClick={() => setSummaryPeriod("annual")}
                  >
                    年間
                  </button>
                </div>
                {summaryPeriod === "annual" ? (
                  <select
                    aria-label="表示する年"
                    className="year-input"
                    value={selectedYear}
                    onChange={(e) =>
                      setMonth(`${e.target.value}-${month.slice(5, 7)}`)
                    }
                  >
                    {Array.from(
                      new Set([
                        today().slice(0, 4),
                        ...entries.map((entry) => entry.date.slice(0, 4)),
                      ]),
                    )
                      .sort((a, b) => b.localeCompare(a))
                      .map((year) => (
                        <option key={year} value={year}>
                          {year}年
                        </option>
                      ))}
                  </select>
                ) : (
                  <>
                    <input
                      aria-label="表示する月"
                      className="month-input"
                      type="month"
                      value={month}
                      onChange={(e) => {
                        setMonth(e.target.value);
                        setBulkPlanMessage("");
                      }}
                    />
                    <div className="schedule-buttons">
                      <button
                        className="basic-plan-button"
                        type="button"
                        onClick={createBasicSchedule}
                        disabled={bulkPlanning}
                      >
                        {bulkPlanning ? "作成中…" : "基本予定を入れる"}
                      </button>
                      <button
                        className="holiday-range-button"
                        type="button"
                        onClick={toggleHolidayRange}
                      >
                        連休を設定
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {summaryPeriod === "monthly" && bulkPlanMessage && (
              <p
                className={`bulk-plan-message ${bulkPlanMessage.includes("登録しました") ? "success" : ""}`}
              >
                {bulkPlanMessage}
              </p>
            )}
            {summaryPeriod === "monthly" && showHolidayRange && (
              <div className="holiday-range-panel">
                <div className="holiday-range-fields">
                  <label>
                    <span>開始日</span>
                    <input
                      type="date"
                      value={holidayRange.start}
                      onChange={(e) =>
                        setHolidayRange({
                          ...holidayRange,
                          start: e.target.value,
                          end:
                            holidayRange.end < e.target.value
                              ? e.target.value
                              : holidayRange.end,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>終了日</span>
                    <input
                      type="date"
                      min={holidayRange.start || undefined}
                      value={holidayRange.end}
                      onChange={(e) =>
                        setHolidayRange({
                          ...holidayRange,
                          end: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="holiday-name">
                    <span>連休の名前</span>
                    <input
                      placeholder="例：お盆休み・年末年始"
                      value={holidayRange.label}
                      onChange={(e) =>
                        setHolidayRange({
                          ...holidayRange,
                          label: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={createHolidayRange}
                  disabled={holidayRangeSaving}
                >
                  {holidayRangeSaving
                    ? "設定しています…"
                    : "この期間を休みにする"}
                </button>
                {holidayRangeMessage && <p>{holidayRangeMessage}</p>}
              </div>
            )}
            <div className="summary-grid">
              <article>
                <span className="summary-icon blue">日</span>
                <div>
                  <small>勤務日数</small>
                  <strong>
                    {summary.days}
                    <span>日</span>
                  </strong>
                </div>
              </article>
              <article>
                <span className="summary-icon work">時</span>
                <div>
                  <small>総労働時間</small>
                  <strong>{formatMinutes(summary.work)}</strong>
                </div>
              </article>
              <article>
                <span className="summary-icon amber">早</span>
                <div>
                  <small>早出合計</small>
                  <strong>{formatMinutes(summary.early)}</strong>
                </div>
              </article>
              <article>
                <span className="summary-icon coral">残</span>
                <div>
                  <small>残業合計</small>
                  <strong>{formatMinutes(summary.overtime)}</strong>
                </div>
              </article>
              <article>
                <span className="summary-icon trip">出</span>
                <div>
                  <small>出張日数</small>
                  <strong>
                    {summary.trips}
                    <span>日</span>
                  </strong>
                </div>
              </article>
              <article className="dinner-summary">
                <span className="summary-icon dinner">食</span>
                <div>
                  <small>自費で夜ご飯</small>
                  <strong>
                    {summary.selfDinner}
                    <span>回</span>
                  </strong>
                </div>
              </article>
              <article className="hotel-summary">
                <span className="summary-icon hotel">泊</span>
                <div>
                  <small>{month.slice(0, 4)}年ホテル</small>
                  <strong>
                    {annualHotelNights}
                    <span>泊</span>
                  </strong>
                </div>
              </article>
            </div>
            <div className="pay-estimate-card">
              <div className="pay-estimate-main">
                <span className="pay-icon">給</span>
                <div>
                  <small>概算給与（控除前）</small>
                  <strong>
                    {estimatedPay
                      ? `¥${estimatedPay.total.toLocaleString("ja-JP")}`
                      : "日給を設定してください"}
                  </strong>
                </div>
              </div>
              {estimatedPay && (
                <div className="pay-breakdown">
                  <span>
                    基本給 ¥{estimatedPay.base.toLocaleString("ja-JP")}
                  </span>
                  <span>
                    早出・残業 ¥{estimatedPay.extra.toLocaleString("ja-JP")}
                  </span>
                </div>
              )}
              <details className="pay-settings">
                <summary>給与設定</summary>
                <div>
                  <label>
                    <span>日給</span>
                    <div className="pay-input-wrap">
                      <b>¥</b>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="100"
                        placeholder="例：10000"
                        value={paySettings.dailyRate}
                        onChange={(e) =>
                          updatePaySettings({
                            ...paySettings,
                            dailyRate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </label>
                  <label>
                    <span>1日の所定時間</span>
                    <div className="pay-input-wrap">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        max="24"
                        step="0.5"
                        value={paySettings.standardHours}
                        onChange={(e) =>
                          updatePaySettings({
                            ...paySettings,
                            standardHours: e.target.value,
                          })
                        }
                      />
                      <b>時間</b>
                    </div>
                  </label>
                  <label>
                    <span>早出・残業倍率</span>
                    <div className="pay-input-wrap">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        step="0.05"
                        value={paySettings.overtimeMultiplier}
                        onChange={(e) =>
                          updatePaySettings({
                            ...paySettings,
                            overtimeMultiplier: e.target.value,
                          })
                        }
                      />
                      <b>倍</b>
                    </div>
                  </label>
                  <p>
                    計算：日給×勤務日数（半日は0.5日）＋早出・残業時間×日給換算の時間単価×倍率。税金・保険・手当などは含まない概算です。
                  </p>
                </div>
              </details>
            </div>
            {summaryPeriod === "monthly" && plannedMonthEntries.length > 0 && (
              <p className="planned-summary">
                この月の勤務予定：
                <strong>{plannedMonthEntries.length}件</strong>
                （月間実績には含めていません）
              </p>
            )}
            {summaryPeriod === "monthly" && selfDinnerEntries.length > 0 && (
              <details className="self-dinner-details">
                <summary>
                  <strong>自費で夜ご飯を食べた日</strong>
                  <span>{selfDinnerEntries.length}件</span>
                </summary>
                <div className="dinner-date-list">
                  {selfDinnerEntries.map((entry) => (
                    <time key={entry.id} dateTime={entry.date}>
                      {formatDate(entry.date)}
                    </time>
                  ))}
                </div>
              </details>
            )}
            <div className="monthly-rankings">
              <article>
                <div className="ranking-title">
                  <strong>よく行った現場</strong>
                  <span>{selectedYear}年 上位5件</span>
                </div>
                <div className="ranking-content">
                  {annualRankings.sites.length ? (
                    <ol>
                      {annualRankings.sites.map(([name, count]) => (
                        <li key={name}>
                          <span>{name}</span>
                          <strong>{count}回</strong>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>この年の現場記録はありません</p>
                  )}
                </div>
              </article>
              <article>
                <div className="ranking-title">
                  <strong>一緒に働いた人</strong>
                  <span>{selectedYear}年 上位5名</span>
                </div>
                <div className="ranking-content">
                  {annualRankings.people.length ? (
                    <ol>
                      {annualRankings.people.map(([name, count]) => (
                        <li key={name}>
                          <span>{name}</span>
                          <strong>{count}回</strong>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>この年の作業者記録はありません</p>
                  )}
                </div>
              </article>
              <article>
                <div className="ranking-title">
                  <strong>よく泊まったホテル</strong>
                  <span>{selectedYear}年 上位5件</span>
                </div>
                <div className="ranking-content">
                  {annualRankings.hotels.length ? (
                    <ol>
                      {annualRankings.hotels.map(([name, count]) => (
                        <li key={name}>
                          <span>{name}</span>
                          <strong>{count}泊</strong>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>この年のホテル記録はありません</p>
                  )}
                </div>
              </article>
            </div>
          </section>
        )}

        {activeTab === "shiftboard" && (
          <details className="shiftboard-section collapsible-section" open>
            <summary className="section-toggle">
              <div>
                <span className="eyebrow">SHIFTBOARD TRANSFER</span>
                <h2>シフトボード転記</h2>
              </div>
              <span className="transfer-progress">
                {
                  shiftBoardEntries.filter((entry) =>
                    shiftBoardDone.includes(shiftBoardFingerprint(entry)),
                  ).length
                }
                /{shiftBoardEntries.length}件
              </span>
            </summary>
            <div className="collapsible-content">
              <p className="transfer-guide">
                シフトボードの「履歴から追加」で通常勤務の日を続けて登録し、時間が違う日と休みだけ個別に入力すると早く終わります。
              </p>
              {!shiftBoardEntries.length ? (
                <div className="transfer-empty">
                  この月の勤務記録はありません
                </div>
              ) : (
                <>
                  <div className="transfer-groups">
                    <article>
                      <div>
                        <span className="transfer-label normal">通常</span>
                        <strong>08:00〜17:00</strong>
                        <small>{shiftBoardGroups.normal.length}日</small>
                      </div>
                      <div className="transfer-date-column">
                        {shiftBoardGroups.normal.length ? (
                          shiftBoardGroups.normal.map((entry) => {
                            const done = shiftBoardDone.includes(
                              shiftBoardFingerprint(entry),
                            );
                            return (
                              <label
                                className={done ? "done" : ""}
                                key={entry.id}
                              >
                                <input
                                  type="checkbox"
                                  checked={done}
                                  onChange={() => toggleShiftBoardDone(entry)}
                                />
                                <b>{formatDate(entry.date)}</b>
                              </label>
                            );
                          })
                        ) : (
                          <span className="none">該当なし</span>
                        )}
                      </div>
                    </article>
                    <article>
                      <div>
                        <span className="transfer-label exception">例外</span>
                        <strong>時間が違う勤務</strong>
                        <small>{shiftBoardGroups.exceptions.length}日</small>
                      </div>
                      <div className="transfer-date-column">
                        {shiftBoardGroups.exceptions.length ? (
                          shiftBoardGroups.exceptions.map((entry) => {
                            const range = shiftBoardRange(entry);
                            const done = shiftBoardDone.includes(
                              shiftBoardFingerprint(entry),
                            );
                            return (
                              <label
                                className={done ? "done" : ""}
                                key={entry.id}
                              >
                                <input
                                  type="checkbox"
                                  checked={done}
                                  onChange={() => toggleShiftBoardDone(entry)}
                                />
                                <b>{formatDate(entry.date)}</b>
                                <em>
                                  {range.start}〜{range.end}
                                </em>
                              </label>
                            );
                          })
                        ) : (
                          <span className="none">該当なし</span>
                        )}
                      </div>
                    </article>
                    <article>
                      <div>
                        <span className="transfer-label off">休み</span>
                        <strong>休みとして入力</strong>
                        <small>{shiftBoardGroups.daysOff.length}日</small>
                      </div>
                      <div className="transfer-date-column">
                        {shiftBoardGroups.daysOff.length ? (
                          shiftBoardGroups.daysOff.map((entry) => {
                            const done = shiftBoardDone.includes(
                              shiftBoardFingerprint(entry),
                            );
                            return (
                              <label
                                className={done ? "done" : ""}
                                key={entry.id}
                              >
                                <input
                                  type="checkbox"
                                  checked={done}
                                  onChange={() => toggleShiftBoardDone(entry)}
                                />
                                <b>{formatDate(entry.date)}</b>
                              </label>
                            );
                          })
                        ) : (
                          <span className="none">該当なし</span>
                        )}
                      </div>
                    </article>
                  </div>
                  <div className="transfer-list-heading">
                    <strong>
                      未入力 <span>{pendingShiftBoardEntries.length}件</span>
                    </strong>
                    <button type="button" onClick={clearShiftBoardDone}>
                      この月をリセット
                    </button>
                  </div>
                  {pendingShiftBoardEntries.length ? (
                    <div className="transfer-list">
                      {pendingShiftBoardEntries.map((entry) =>
                        shiftBoardRow(entry, false),
                      )}
                    </div>
                  ) : (
                    <div className="transfer-complete-message">
                      ✓ この月の入力はすべて完了しています
                    </div>
                  )}
                  {completedShiftBoardEntries.length > 0 && (
                    <details className="completed-transfer-list">
                      <summary>
                        <strong>入力済み</strong>
                        <span>{completedShiftBoardEntries.length}件</span>
                      </summary>
                      <div className="transfer-list">
                        {completedShiftBoardEntries.map((entry) =>
                          shiftBoardRow(entry, true),
                        )}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          </details>
        )}

        {activeTab === "sites" && (
          <details className="site-summary-section collapsible-section" open>
            <summary className="section-toggle">
              <div>
                <span className="eyebrow">SITE LIST</span>
                <h2>現場一覧</h2>
              </div>
              <span className="count">{siteCards.length}現場</span>
            </summary>
            <div className="collapsible-content">
              <div className="site-card-search">
                <span>⌕</span>
                <input
                  type="search"
                  aria-label="現場名で検索"
                  placeholder="現場名を入力して検索"
                  value={siteCardSearch}
                  onChange={(e) => setSiteCardSearch(e.target.value)}
                />
                {siteCardSearch && (
                  <button type="button" onClick={() => setSiteCardSearch("")}>
                    クリア
                  </button>
                )}
                <small>{filteredSiteCards.length}件</small>
              </div>
              <div className="site-list-controls">
                <label>
                  <span>並べ替え</span>
                  <select
                    value={siteCardSort}
                    onChange={(e) =>
                      setSiteCardSort(e.target.value as "region" | "name" | "newest" | "oldest")
                    }
                  >
                    <option value="region">地域順</option>
                    <option value="name">あいうえお順</option>
                    <option value="oldest">前回訪問日：古い順</option>
                    <option value="newest">前回訪問日：新しい順</option>
                  </select>
                </label>
                <label>
                  <span>住所</span>
                  <select
                    value={siteAddressFilter}
                    onChange={(e) =>
                      setSiteAddressFilter(
                        e.target.value as "all" | "registered" | "missing",
                      )
                    }
                  >
                    <option value="all">すべて</option>
                    <option value="registered">住所登録済み</option>
                    <option value="missing">住所未登録</option>
                  </select>
                </label>
                <label>
                  <span>資料</span>
                  <select
                    value={siteDocumentFilter}
                    onChange={(e) =>
                      setSiteDocumentFilter(e.target.value as "all" | "has" | "none")
                    }
                  >
                    <option value="all">すべて</option>
                    <option value="has">資料あり</option>
                    <option value="none">資料なし</option>
                  </select>
                </label>
                {(siteCardSort !== "region" ||
                  siteAddressFilter !== "all" ||
                  siteDocumentFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSiteCardSort("region");
                      setSiteAddressFilter("all");
                      setSiteDocumentFilter("all");
                    }}
                  >
                    リセット
                  </button>
                )}
              </div>
              <div className="site-master-toolbar">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewSite((current) => !current);
                    setNewSiteMessage("");
                  }}
                >
                  {showNewSite ? "閉じる" : "＋ 新しい現場を追加"}
                </button>
              </div>
              {showNewSite && (
                <div className="site-master-form">
                  <label>
                    <span>現場名</span>
                    <input
                      value={newSiteDraft.site}
                      onChange={(e) =>
                        setNewSiteDraft({
                          ...newSiteDraft,
                          site: e.target.value,
                        })
                      }
                      placeholder="例：〇〇太陽光発電所"
                    />
                  </label>
                  <label>
                    <span>地域・場所</span>
                    <input
                      value={newSiteDraft.location}
                      onChange={(e) =>
                        setNewSiteDraft({
                          ...newSiteDraft,
                          location: e.target.value,
                        })
                      }
                      placeholder="例：熊本市北区"
                    />
                  </label>
                  <label className="wide">
                    <span>位置情報（住所 または 緯度・経度）</span>
                    <input
                      value={positionInputValue(
                        newSiteDraft.address,
                        newSiteDraft.coordinates,
                      )}
                      onChange={(e) => {
                        const position = parsePositionInput(e.target.value);
                        setNewSiteDraft({
                          ...newSiteDraft,
                          ...position,
                        });
                      }}
                      placeholder="住所 または 32.803100, 130.707900"
                    />
                  </label>
                  <div className="site-master-form-actions">
                    <button
                      type="button"
                      onClick={useCurrentLocationForNewSite}
                    >
                      現在地を取得
                    </button>
                    <button
                      className="primary"
                      type="button"
                      onClick={createSiteMaster}
                      disabled={newSiteSaving}
                    >
                      {newSiteSaving ? "追加中…" : "この現場を追加"}
                    </button>
                  </div>
                </div>
              )}
              {newSiteMessage && (
                <p className="site-location-result">{newSiteMessage}</p>
              )}
              {siteLocationMessage && !editingSiteLocationKey && (
                <p className="site-location-result">{siteLocationMessage}</p>
              )}
              {siteNameMessage && !editingSiteNameKey && (
                <p className="site-location-result">{siteNameMessage}</p>
              )}
              {!siteCards.length ? (
                <div className="empty">
                  <span>現</span>
                  <h3>現場が登録されていません</h3>
                  <p>「新しい現場を追加」から登録できます。</p>
                </div>
              ) : !filteredSiteCards.length ? (
                <div className="empty site-search-empty">
                  <span>⌕</span>
                  <h3>該当する現場がありません</h3>
                  <p>現場名の一部を変えて検索してください。</p>
                </div>
              ) : (
                <div className="site-region-groups">
                  {groupedSiteCards.map((prefectureGroup) => (
                    <details
                      className={`site-region-group ${prefectureGroup.flat ? "date-sorted-flat" : ""}`}
                      key={prefectureGroup.prefecture}
                      open={prefectureGroup.flat ? true : undefined}
                    >
                      <summary className="site-region-heading">
                        <strong>{prefectureGroup.label}</strong>
                        <span>{prefectureGroup.count}現場</span>
                      </summary>
                      <div className="site-municipality-groups">
                        {prefectureGroup.municipalities.map(
                          ([municipality, cards]) => (
                            <section
                              className="site-municipality-group"
                              key={`${prefectureGroup.prefecture}-${municipality}`}
                            >
                              {!prefectureGroup.flat && (
                                <header className="site-municipality-heading">
                                  <strong>{municipality}</strong>
                                  <span>{cards.length}件</span>
                                </header>
                              )}
                              <div className="site-card-grid">
                                {cards.map((card) => {
                                  const days = card.lastDate
                                    ? elapsedDays(today(), card.lastDate)
                                    : null;
                                  const latestNotes = [...card.notes]
                                    .sort((a, b) =>
                                      b.date.localeCompare(a.date),
                                    )
                                    .slice(0, 3);
                                  const cardKey = siteCardKey(card);
                                  const documents = siteDocumentsByKey[cardKey];
                                  const documentCount =
                                    documents?.length ??
                                    (siteDocumentCounts === null
                                      ? undefined
                                      : (siteDocumentCounts[cardKey] ?? 0));
                                  const resolvedAddress =
                                    card.address ||
                                    coordinateAddresses[
                                      coordinateKey(card.coordinates)
                                    ] ||
                                    "";
                                  return (
                                    <details
                                      className="site-card"
                                      key={cardKey}
                                      onToggle={(event) => {
                                        if (event.currentTarget.open)
                                          void loadSiteDocuments(cardKey);
                                      }}
                                    >
                                      <summary className="site-card-row">
                                        <div className="site-card-identity">
                                          <small>
                                            {card.location || "場所未入力"}
                                          </small>
                                          <div className="site-name-line">
                                            <h3>{card.site || "現場名不明"}</h3>
                                          </div>
                                        </div>
                                        <div className="site-row-last">
                                          <small>最終訪問</small>
                                          <strong>
                                            {card.lastDate
                                              ? formatDate(card.lastDate)
                                              : "未訪問"}
                                          </strong>
                                        </div>
                                        <em className="site-row-elapsed">
                                          {days === null
                                            ? "新規"
                                            : days === 0
                                              ? "今日"
                                              : `${days}日経過`}
                                        </em>
                                        {(resolvedAddress || card.coordinates) && (
                                          <a
                                            className="map-button"
                                            href={mapsUrl(
                                              resolvedAddress,
                                              card.coordinates,
                                              card.location,
                                              card.site,
                                            )}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) =>
                                              event.stopPropagation()
                                            }
                                          >
                                            地図 ↗
                                          </a>
                                        )}
                                        <span className="site-row-open">
                                          詳細
                                        </span>
                                      </summary>
                                      <div className="site-card-expanded">
                                        <div className="site-card-location">
                                          <div>
                                            {resolvedAddress && (
                                              <p className="site-address">
                                                {resolvedAddress}
                                              </p>
                                            )}
                                            {card.coordinates && (
                                              <p className="site-coordinates">
                                                {card.coordinates}
                                              </p>
                                            )}
                                          </div>
                                          <div className="site-card-actions">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openSiteNameEditor(card)
                                              }
                                            >
                                              {editingSiteNameKey === cardKey
                                                ? "閉じる"
                                                : "現場名を編集"}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openSiteLocationEditor(card)
                                              }
                                            >
                                              {editingSiteLocationKey ===
                                              cardKey
                                                ? "閉じる"
                                                : "現場情報を編集"}
                                            </button>
                                            {card.masterId && (
                                              <button
                                                className="danger"
                                                type="button"
                                                onClick={() =>
                                                  archiveSite(card)
                                                }
                                              >
                                                非表示
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        {editingSiteNameKey === cardKey && (
                                          <div className="site-name-editor">
                                            <label>
                                              <span>新しい現場名</span>
                                              <input
                                                value={siteNameDraft}
                                                onChange={(e) =>
                                                  setSiteNameDraft(
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder="現場名を入力"
                                              />
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => saveSiteName(card)}
                                              disabled={siteNameSaving}
                                            >
                                              {siteNameSaving
                                                ? "変更中…"
                                                : "過去の記録もまとめて変更"}
                                            </button>
                                            {siteNameMessage && (
                                              <p>{siteNameMessage}</p>
                                            )}
                                          </div>
                                        )}
                                        {editingSiteLocationKey === cardKey && (
                                          <div className="site-location-editor">
                                            <label>
                                              <span>地域・場所</span>
                                              <input
                                                placeholder="例：熊本市北区"
                                                value={
                                                  siteLocationDraft.location
                                                }
                                                onChange={(e) =>
                                                  setSiteLocationDraft({
                                                    ...siteLocationDraft,
                                                    location: e.target.value,
                                                  })
                                                }
                                              />
                                            </label>
                                            <label>
                                              <span>
                                                位置情報（住所 または 緯度・経度）
                                              </span>
                                              <input
                                                placeholder="住所 または 32.803100, 130.707900"
                                                value={positionInputValue(
                                                  siteLocationDraft.address,
                                                  siteLocationDraft.coordinates,
                                                )}
                                                onChange={(e) => {
                                                  const position =
                                                    parsePositionInput(
                                                      e.target.value,
                                                    );
                                                  setSiteLocationDraft({
                                                    ...siteLocationDraft,
                                                    ...position,
                                                  });
                                                }}
                                              />
                                            </label>
                                            <div className="site-location-buttons">
                                              <button
                                                type="button"
                                                onClick={useCurrentLocation}
                                                disabled={siteLocationSaving}
                                              >
                                                現在地を取得
                                              </button>
                                              <button
                                                className="save-location"
                                                type="button"
                                                onClick={() =>
                                                  saveSiteLocation(card)
                                                }
                                                disabled={siteLocationSaving}
                                              >
                                                {siteLocationSaving
                                                  ? "保存中…"
                                                  : "現場情報を保存"}
                                              </button>
                                            </div>
                                            {siteLocationMessage && (
                                              <p>{siteLocationMessage}</p>
                                            )}
                                          </div>
                                        )}
                                        <section className="site-documents">
                                          <header>
                                            <div>
                                              <strong>現場資料</strong>
                                              <span>
                                                {documentCount ?? 0}件
                                              </span>
                                            </div>
                                            <label
                                              className={
                                                siteDocumentUploadingKey ===
                                                cardKey
                                                  ? "uploading"
                                                  : ""
                                              }
                                            >
                                              <input
                                                type="file"
                                                accept="image/*,.pdf,application/pdf"
                                                multiple
                                                disabled={
                                                  siteDocumentUploadingKey ===
                                                  cardKey
                                                }
                                                onChange={(event) => {
                                                  void uploadSiteDocuments(
                                                    card,
                                                    event.currentTarget.files,
                                                  );
                                                  event.currentTarget.value =
                                                    "";
                                                }}
                                              />
                                              {siteDocumentUploadingKey ===
                                              cardKey
                                                ? "保存中…"
                                                : "画像・PDFを追加"}
                                            </label>
                                          </header>
                                          {siteDocumentLoadingKey === cardKey &&
                                          !documents ? (
                                            <p className="site-document-empty">
                                              資料を読み込んでいます…
                                            </p>
                                          ) : documents?.length ? (
                                            <div className="site-document-list">
                                              {documents.map((document) => (
                                                <div
                                                  className="site-document-row"
                                                  key={document.id}
                                                >
                                                  <a
                                                    href={`/api/site-documents/file?id=${document.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                  >
                                                    <b>
                                                      {document.contentType ===
                                                      "application/pdf"
                                                        ? "PDF"
                                                        : "画像"}
                                                    </b>
                                                    <span>
                                                      <strong>
                                                        {document.fileName}
                                                      </strong>
                                                      <small>
                                                        {formatFileSize(
                                                          document.size,
                                                        )}
                                                        ・
                                                        {new Intl.DateTimeFormat(
                                                          "ja-JP",
                                                          {
                                                            month: "numeric",
                                                            day: "numeric",
                                                          },
                                                        ).format(
                                                          new Date(
                                                            document.uploadedAt,
                                                          ),
                                                        )}
                                                      </small>
                                                    </span>
                                                  </a>
                                                  <button
                                                    type="button"
                                                    aria-label={`${document.fileName}を削除`}
                                                    onClick={() =>
                                                      deleteSiteDocument(
                                                        card,
                                                        document,
                                                      )
                                                    }
                                                  >
                                                    削除
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="site-document-empty">
                                              除草範囲の図面や現場画像を保存できます。
                                            </p>
                                          )}
                                          {siteDocumentMessages[cardKey] && (
                                            <p className="site-document-message">
                                              {siteDocumentMessages[cardKey]}
                                            </p>
                                          )}
                                        </section>
                                        <dl className="site-stats">
                                          <div>
                                            <dt>訪問</dt>
                                            <dd>{card.visits}回</dd>
                                          </div>
                                          <div>
                                            <dt>勤務</dt>
                                            <dd>{card.workDays}日</dd>
                                          </div>
                                          <div>
                                            <dt>出張</dt>
                                            <dd>{card.tripCount}回</dd>
                                          </div>
                                        </dl>
                                        <div className="site-card-detail">
                                          <strong>作業内容</strong>
                                          <p>
                                            {[...card.works].join("・") ||
                                              "記録なし"}
                                          </p>
                                        </div>
                                        <div className="site-card-detail">
                                          <strong>一緒に行った人</strong>
                                          <p>
                                            {[...card.people].join("、") ||
                                              "記録なし"}
                                          </p>
                                        </div>
                                        <div className="site-card-detail">
                                          <strong>最近のメモ</strong>
                                          {latestNotes.length ? (
                                            <ul>
                                              {latestNotes.map((note) => (
                                                <li
                                                  key={`${note.date}-${note.note}`}
                                                >
                                                  <span>
                                                    {formatDate(note.date)}
                                                  </span>
                                                  {note.note}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p>メモはありません</p>
                                          )}
                                        </div>
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </section>
                          ),
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}

        {activeTab === "tools" && (
          <section className="tools-section">
            <div className="tools-heading">
              <div>
                <span className="eyebrow">TOOL CHECKLIST</span>
                <h2>道具チェック表</h2>
                <p>{formatDate(today())}の準備状況</p>
              </div>
              <div className="tools-progress">
                <strong>
                  {checkedToolCount}/{visibleToolItems.length}
                </strong>
                <small>チェック済み</small>
              </div>
            </div>
            <div className="tool-category-tabs" aria-label="業務区分">
              <button
                type="button"
                className={toolCategory === "通常業務" ? "active" : ""}
                onClick={() => setToolCategory("通常業務")}
              >
                通常業務
              </button>
              <button
                type="button"
                className={toolCategory === "出張" ? "active" : ""}
                onClick={() => setToolCategory("出張")}
              >
                出張
              </button>
            </div>
            <div
              className="tool-progress-bar"
              aria-label={`${visibleToolItems.length}件中${checkedToolCount}件完了`}
            >
              <span
                style={{
                  width: `${visibleToolItems.length ? (checkedToolCount / visibleToolItems.length) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="tool-drag-hint">
              スマホでは「≡」を長押しして上下に移動できます
            </p>
            {!toolsReady ? (
              <button className="tools-load" type="button" onClick={loadTools}>
                道具一覧を読み込む
              </button>
            ) : visibleToolSets.length ? (
              <div className="tool-set-grid">
                {visibleToolSets.map((set) => {
                  const completed = set.items.filter(
                    (item) => item.checked,
                  ).length;
                  return (
                    <article
                      className={`tool-set-card ${toolDraggingKey === `set:${set.id}` ? "dragging" : ""}`}
                      key={set.id}
                    >
                      <header>
                        <div>
                          <button
                            className="tool-drag-handle tool-set-drag-handle"
                            type="button"
                            aria-label={`${set.name}を長押しして並び替え`}
                            onPointerDown={(event) =>
                              beginToolDrag(event, "set", set.id, set.id)
                            }
                            onPointerMove={moveToolDrag}
                            onPointerUp={finishToolDrag}
                            onPointerCancel={finishToolDrag}
                            onContextMenu={(event) => event.preventDefault()}
                          >
                            ≡
                          </button>
                          <h3>{set.name}</h3>
                          <span>
                            {completed}/{set.items.length}
                          </span>
                        </div>
                        <div className="tool-header-actions">
                          <button
                            type="button"
                            onClick={() => editTool("set", set.id, set.name)}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            aria-label={`${set.name}を削除`}
                            onClick={() => deleteTool("set", set.id, set.name)}
                          >
                            削除
                          </button>
                        </div>
                      </header>
                      <div className="tool-item-list">
                        {set.items.map((item) => (
                          <div
                            className={`tool-item ${item.checked ? "checked" : ""} ${toolDraggingKey === `item:${item.id}` ? "dragging" : ""}`}
                            key={item.id}
                          >
                            <label>
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => toggleTool(item)}
                              />
                              <span>{item.name}</span>
                            </label>
                            <div className="tool-item-actions">
                              <button
                                className="tool-edit-item"
                                type="button"
                                onClick={() =>
                                  editTool("item", item.id, item.name)
                                }
                              >
                                編集
                              </button>
                              <button
                                className="tool-drag-handle"
                                type="button"
                                aria-label={`${item.name}を長押しして並び替え`}
                                onPointerDown={(event) =>
                                  beginToolDrag(event, "item", set.id, item.id)
                                }
                                onPointerMove={moveToolDrag}
                                onPointerUp={finishToolDrag}
                                onPointerCancel={finishToolDrag}
                                onContextMenu={(event) =>
                                  event.preventDefault()
                                }
                              >
                                ≡
                              </button>
                              <button
                                className="tool-delete-item"
                                type="button"
                                aria-label={`${item.name}を削除`}
                                onClick={() =>
                                  deleteTool("item", item.id, item.name)
                                }
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="tool-add-item">
                        <input
                          value={newToolNames[set.id] ?? ""}
                          onChange={(event) =>
                            setNewToolNames((current) => ({
                              ...current,
                              [set.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addToolItem(set.id);
                            }
                          }}
                          placeholder="道具名を追加"
                        />
                        <button
                          type="button"
                          onClick={() => addToolItem(set.id)}
                        >
                          追加
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                <span>具</span>
                <h3>{toolCategory}のセットがありません</h3>
                <p>下の欄からセットを追加できます。</p>
              </div>
            )}
            <div className="tool-add-set">
              <input
                value={newToolSetName}
                onChange={(event) => setNewToolSetName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addToolSet();
                  }
                }}
                placeholder={`${toolCategory}の新しいセット名`}
              />
              <button type="button" onClick={addToolSet}>
                セットを追加
              </button>
            </div>
            <div className="tools-footer">
              <button type="button" onClick={resetToolChecks}>
                今日のチェックをリセット
              </button>
              {toolMessage && <p>{toolMessage}</p>}
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="settings-skin-card">
            <div>
              <span className="eyebrow">APPEARANCE</span>
              <h2>画面のスキン</h2>
            </div>
            <div className="skin-options" aria-label="画面のスキン">
              {(
                [
                  ["green", "グリーン"],
                  ["black", "ブラック"],
                  ["blue", "ブルー"],
                  ["purple", "パープル"],
                  ["brown", "ブラウン"],
                ] as [Skin, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`${value} ${skin === value ? "active" : ""}`}
                  aria-pressed={skin === value}
                  onClick={() => setSkin(value)}
                >
                  <span />
                  {label}
                  {skin === value && <b>選択中</b>}
                </button>
              ))}
            </div>
            <div className="font-size-settings">
              <div>
                <strong>文字サイズ</strong>
                <small>アプリ全体の文字サイズを変更できます</small>
              </div>
              <div className="font-size-options" aria-label="文字サイズ">
                {([
                  ["small", "小さめ"],
                  ["standard", "標準"],
                  ["large", "大きめ"],
                ] as [FontSize, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={fontSize === value ? "active" : ""}
                    aria-pressed={fontSize === value}
                    onClick={() => setFontSize(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
        {activeTab === "settings" && (
          <section className="app-info-card">
            <div>
              <span className="eyebrow">APP INFORMATION</span>
              <h2>アプリ情報</h2>
            </div>
            <dl>
              <div>
                <dt>バージョン</dt>
                <dd>v{APP_VERSION}</dd>
              </div>
              <div>
                <dt>更新日</dt>
                <dd>{APP_UPDATED_AT}</dd>
              </div>
            </dl>
          </section>
        )}
        {activeTab === "settings" && (
          <details className="reminder-section collapsible-section" open>
            <summary className="section-toggle">
              <div>
                <span className="eyebrow">REMINDER</span>
                <h2>通知設定</h2>
              </div>
              <span className="reminder-status">
                {notificationStatus === "granted" ? "オン" : "設定"}
              </span>
            </summary>
            <div className="reminder-content">
              <div>
                <p>・毎日21時以降、当日の勤務記録がない場合</p>
                <p>
                  ・月末日の前日21時以降、シフトボードへの入力時期になった場合
                </p>
                <p className="reminder-note">
                  アプリを開いている時、またはその後に次回開いた時に、この端末へ1回だけお知らせします。
                </p>
              </div>
              <button
                type="button"
                className={notificationStatus === "granted" ? "enabled" : ""}
                onClick={enableNotifications}
                disabled={
                  notificationStatus === "granted" ||
                  notificationStatus === "denied" ||
                  notificationStatus === "unsupported"
                }
              >
                {notificationStatus === "granted"
                  ? "通知オン"
                  : notificationStatus === "denied"
                    ? "通知が拒否されています"
                    : notificationStatus === "unsupported"
                      ? "この端末は非対応"
                      : "通知をオンにする"}
              </button>
            </div>
          </details>
        )}

        {activeTab === "plans" && featuredPlanGroups.map((group) => (
          <section className="history-section today-plans" aria-labelledby={group.id} key={group.id}>
            <div className="section-heading">
              <div className="heading-title-line">
                <h2 id={group.id}>{group.title}</h2>
                <time dateTime={group.date}>{fullDateLabel(group.date)}</time>
              </div>
              <span className="count">{group.entries.length}件</span>
            </div>
            {!ready ? <p role="status">{group.loading}</p> : group.entries.length === 0 ? (
              <div className="empty"><h3>{group.emptyTitle}</h3><p>{group.emptyHelp}</p></div>
            ) : (
              <div className="today-plan-list">
                {group.entries.map((entry) => (
                  <article className="today-plan-card" key={entry.id}>
                    <header className="today-plan-header">
                      <div><span className={`type-badge type-${entry.type}`}>{entry.type}</span>{entry.type !== "休み" && <strong>{formatEntryTimes(entry)}</strong>}</div>
                      <button type="button" onClick={() => edit(entry)}>編集</button>
                    </header>
                    {entry.type === "休み" ? <p>{entry.note || "本日は休みです"}</p> : (
                      <>
                        {entrySiteRows(entry).length === 0 && <p>現場は未登録です</p>}
                        {entrySiteRows(entry).map((row, index) => {
                          const cardKey = siteCardKey(row);
                          const master = siteMasters.find((site) => siteCardKey(site) === cardKey);
                          const address = row.address || master?.address || "";
                          const coordinates = row.coordinates || master?.coordinates || "";
                          const documents = siteDocumentsByKey[cardKey];
                          const count = documents?.length ?? siteDocumentCounts?.[cardKey];
                          const hasSite = Boolean(row.site || row.location || row.address || row.coordinates);
                          return (
                            <section className="today-plan-site" key={`${entry.id}-${index}`}>
                              <p className="today-plan-location">{row.location || "場所未入力"}</p>
                              <h3>{row.site || "現場名未入力"}</h3>
                              <dl>
                                <div><dt>作業内容</dt><dd>{row.work || "未入力"}</dd></div>
                                {row.personnelNames && <div><dt>作業者</dt><dd>{row.personnelNames}</dd></div>}
                                <div><dt>位置情報</dt><dd>{address || coordinates ? <>{address && <span>{address}</span>}{coordinates && <span>{coordinates}</span>}</> : "未登録"}</dd></div>
                              </dl>
                              {(address.trim() || coordinates.trim()) && (
                                <div className="today-plan-map-actions">
                                  <a className="today-plan-map today-plan-navigation" href={navigationUrl(address, coordinates)} target="_blank" rel="noreferrer" aria-label={`${row.site || row.location || "現場"}まで車でナビを開く`}>🚗 現場までナビ</a>
                                  <a className="today-plan-map" href={mapsUrl(address, coordinates, row.location, row.site)} target="_blank" rel="noreferrer">🗺️ Googleマップで開く</a>
                                </div>
                              )}
                              {row.note && <p className="today-plan-note">{row.note}</p>}
                              {hasSite && (
                                <details className="today-plan-documents" onToggle={(event) => { if (event.currentTarget.open) void loadSiteDocuments(cardKey); }}>
                                  <summary>📎 現場資料{count !== undefined ? `（${count}件）` : "を確認"}</summary>
                                  {siteDocumentLoadingKey === cardKey && !documents && <p role="status">資料を読み込んでいます…</p>}
                                  {documents?.length === 0 && <p>登録された資料はありません</p>}
                                  {documents?.map((document) => <a key={document.id} href={`/api/site-documents/file?id=${document.id}`} target="_blank" rel="noreferrer">{document.contentType === "application/pdf" ? "PDF" : "画像"}：{document.fileName} ↗</a>)}
                                  {siteDocumentMessages[cardKey] && <p role="status">{siteDocumentMessages[cardKey]}</p>}
                                  {siteDocumentMessages[cardKey] && <button type="button" onClick={() => void loadSiteDocuments(cardKey, true)}>資料を再読み込み</button>}
                                </details>
                              )}
                            </section>
                          );
                        })}
                        {entry.businessTrip && <p>出張・夜ご飯：{entry.dinnerType || "未選択"}{entry.hotelName && ` ／ 宿泊：${entry.hotelName}`}</p>}
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
        {(activeTab === "history" || activeTab === "plans") && (
          <section className="history-section">
            <div className="section-heading history-heading">
              <div>
                <span className="eyebrow">
                  {activeTab === "plans"
                    ? "UPCOMING PLANS"
                    : "ATTENDANCE RECORDS"}
                </span>
                <div className="heading-title-line">
                  <h2>{activeTab === "plans" ? "それ以降の予定" : "勤務記録"}</h2>
                  <time dateTime={today()}>{fullDateLabel(today())}</time>
                </div>
              </div>
              <div className="history-tools">
                <input
                  aria-label="表示する月"
                  className="month-input"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
                <div className="view-switch" aria-label="表示方法">
                  <button
                    type="button"
                    className={historyView === "list" ? "active" : ""}
                    aria-pressed={historyView === "list"}
                    onClick={() => setHistoryView("list")}
                  >
                    一覧
                  </button>
                  <button
                    type="button"
                    className={historyView === "calendar" ? "active" : ""}
                    aria-pressed={historyView === "calendar"}
                    onClick={() => setHistoryView("calendar")}
                  >
                    カレンダー
                  </button>
                </div>
                <span className="count">{visibleRecordEntries.length}件</span>
              </div>
            </div>
            {activeTab === "plans" &&
              historyView === "list" &&
              visibleRecordEntries.length > 0 && (
                <div className="plan-bulk-toolbar">
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        selectedPlanIds.length === visibleRecordEntries.length
                      }
                      ref={(input) => {
                        if (input)
                          input.indeterminate =
                            selectedPlanIds.length > 0 &&
                            selectedPlanIds.length <
                              visibleRecordEntries.length;
                      }}
                      onChange={(event) =>
                        setSelectedPlanIds(
                          event.target.checked
                            ? visibleRecordEntries.map((entry) => entry.id)
                            : [],
                        )
                      }
                    />
                    表示中の予定を全選択
                  </label>
                  <span>{selectedPlanIds.length}件選択中</span>
                  <button
                    type="button"
                    disabled={!selectedPlanIds.length}
                    onClick={() => removeMany(selectedPlanIds)}
                  >
                    選択した予定を削除
                  </button>
                </div>
              )}
            {!ready ? (
              <div className="empty">
                <h3>記録を読み込んでいます…</h3>
              </div>
            ) : visibleRecordEntries.length === 0 ? (
              <div className="empty">
                <span>{activeTab === "plans" ? "予" : "記"}</span>
                <h3>
                  {activeTab === "plans"
                    ? "この月の予定はありません"
                    : "この月の勤務記録はありません"}
                </h3>
                <p>入力タブから勤務内容を登録すると、ここに表示されます。</p>
              </div>
            ) : historyView === "calendar" ? (
              <div className="calendar-wrap">
                <div className="calendar-weekdays">
                  {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {calendarDays.map((item, index) =>
                    item ? (
                      <div
                        className={`calendar-day ${item.entries.length ? "has-entry" : ""} ${calendarHolidays.has(item.date) ? "holiday" : ""}`}
                        key={item.date}
                      >
                        <span className="calendar-date">{item.day}</span>
                        {calendarHolidays.has(item.date) && (
                          <span className="holiday-name">
                            {calendarHolidays.get(item.date)}
                          </span>
                        )}
                        {item.entries.map((entry) => {
                          const extra = extraMinutes(entry);
                          const planned = entry.date > today();
                          const siteLabel =
                            entry.type === "休み"
                              ? entry.note
                              : displayWorkSummary(entry.location, entry.site, entry.work);
                          const workColor =
                            entry.type === "休み"
                              ? "work-off"
                              : entry.businessTrip
                                ? "work-trip"
                                : "work-normal";
                          return (
                            <button
                              type="button"
                              className={`calendar-entry ${planned ? "planned" : ""} ${workColor}`}
                              key={entry.id}
                              onClick={() => edit(entry)}
                              aria-label={`${formatDate(entry.date)}の${planned ? "予定" : "記録"}を編集`}
                            >
                              <strong>
                                {entry.type === "休み"
                                  ? entry.note || "休み"
                                  : planned
                                    ? "予定"
                                    : entry.type}
                              </strong>
                              {entry.type !== "休み" && siteLabel && (
                                <span>{siteLabel}</span>
                              )}
                              {entry.type !== "休み" && (
                                <small>
                                  {planned
                                    ? entry.type
                                    : [
                                        extra.early
                                          ? `早 ${formatMinutes(extra.early)}`
                                          : "",
                                        extra.overtime
                                          ? `残 ${formatMinutes(extra.overtime)}`
                                          : "",
                                      ]
                                        .filter(Boolean)
                                        .join("・")}
                                </small>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        className="calendar-day blank"
                        key={`blank-${index}`}
                      />
                    ),
                  )}
                </div>
                <p className="calendar-note">
                  記録のある日を押すと編集できます
                </p>
              </div>
            ) : (
              <div className="history-list">
                {visibleRecordEntries.map((entry) => {
                  const extra = extraMinutes(entry);
                  const planned = entry.date > today();
                  const mapTargets = planned
                    ? entrySiteRows(entry).filter(
                        (row) => row.address || row.coordinates,
                      )
                    : [];
                  const workColor =
                    entry.type === "休み"
                      ? "work-off"
                      : entry.businessTrip
                        ? "work-trip"
                        : "work-normal";
                  return (
                    <article
                      className={`history-item ${planned ? "planned" : ""} ${workColor} ${selectedPlanIds.includes(entry.id) ? "selected" : ""}`}
                      key={entry.id}
                    >
                      {activeTab === "plans" && (
                        <label className="plan-select">
                          <input
                            type="checkbox"
                            aria-label={`${entry.date}の予定を選択`}
                            checked={selectedPlanIds.includes(entry.id)}
                            onChange={(event) =>
                              setSelectedPlanIds((current) =>
                                event.target.checked
                                  ? [...current, entry.id]
                                  : current.filter((id) => id !== entry.id),
                              )
                            }
                          />
                        </label>
                      )}
                      <div className="date-block">
                        <strong>
                          {formatDate(entry.date).split("(")[0]}
                          {calendarHolidays.has(entry.date) && (
                            <em
                              className="holiday-flag"
                              title={calendarHolidays.get(entry.date)}
                              aria-label={calendarHolidays.get(entry.date)}
                            >
                              🇯🇵
                            </em>
                          )}
                        </strong>
                        <span>
                          {formatDate(entry.date).match(/\((.+)\)/)?.[1]}
                        </span>
                      </div>
                      <div className="record-main">
                        <div className="record-top">
                          {planned && (
                            <span className="planned-badge">予定</span>
                          )}
                          <span className={`type-badge type-${entry.type}`}>
                            {entry.type}
                          </span>
                          {["1日", "半日"].includes(entry.type) && (
                            <strong>{formatEntryTimes(entry)}</strong>
                          )}
                        </div>
                        <p>
                          {entry.type === "休み" ? (
                            entry.note || "休み"
                          ) : displayWorkSummary(entry.location, entry.site, entry.work) ? (
                            <span className="record-route">
                              {displayWorkSegments(entry.location, entry.site, entry.work).map((segment, index) => (
                                <span className="record-route-step" key={`${entry.id}-${index}`}>{segment}</span>
                              ))}
                            </span>
                          ) : (
                            "現場名・作業内容の記録なし"
                          )}
                        </p>
                      </div>
                      <div className="record-extra">
                        {mapTargets.map((row, index) => (
                          <a
                            className="record-map-link"
                            href={mapsUrl(
                              row.address,
                              row.coordinates,
                              row.location,
                              row.site,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`${row.site || row.location || `${index + 1}件目の現場`}の地図を開く`}
                            key={`${entry.id}-map-${index}`}
                            title={mapTargets.length > 1 ? `現場${index + 1}をGoogleマップで開く` : "Googleマップで開く"}
                          >
                            🗺️
                            {mapTargets.length > 1 && (
                              <small aria-hidden="true">{index + 1}</small>
                            )}
                          </a>
                        ))}
                        {entry.businessTrip && (
                          <span className="trip-badge">
                            出張・夜：{entry.dinnerType || "未選択"}
                          </span>
                        )}
                        {entry.businessTrip && entry.hotelName && (
                          <span className="hotel-badge">
                            宿泊：{entry.hotelName}
                          </span>
                        )}
                        {extra.early > 0 && (
                          <span>早出 {formatMinutes(extra.early)}</span>
                        )}
                        {extra.overtime > 0 && (
                          <span>残業 {formatMinutes(extra.overtime)}</span>
                        )}
                      </div>
                      <div className="actions">
                        <button
                          onClick={() => edit(entry)}
                          aria-label={`${entry.date}を編集`}
                        >
                          編集
                        </button>
                        <button
                          className="delete"
                          onClick={() => remove(entry.id)}
                          aria-label={`${entry.date}を削除`}
                        >
                          削除
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {activeTab === "settings" && (
          <section className="master-management-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">MASTER MANAGEMENT</span>
                <h2>入力候補の管理</h2>
                <p>基本作業は固定表示し、珍しい作業だけ追加できます。</p>
              </div>
            </div>
            <div className="master-columns">
              {(
                [
                  ["work", "作業内容マスター"],
                  ["person", "作業者名マスター"],
                ] as ["work" | "person", string][]
              ).map(([type, title]) => (
                <article key={type}>
                  <h3>{title}</h3>
                  {type === "work" && (
                    <div className="fixed-work-master">
                      <strong>固定項目</strong>
                      <p>削除はできません。矢印で表示順を変更できます。</p>
                      <div>
                        {fixedWorkOrder.map((name, index) => (
                          <span key={name}>
                            <b>{name}</b>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveFixedWork(name, -1)}
                              aria-label={`${name}を上へ`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={index === fixedWorkOrder.length - 1}
                              onClick={() => moveFixedWork(name, 1)}
                              aria-label={`${name}を下へ`}
                            >
                              ↓
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="master-add">
                    <input
                      value={masterDrafts[type]}
                      placeholder={
                        type === "work"
                          ? "例：竹林整備・支柱設置"
                          : "例：山田 太郎"
                      }
                      onChange={(event) =>
                        setMasterDrafts((current) => ({
                          ...current,
                          [type]: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => saveMasterOption(type)}
                    >
                      追加
                    </button>
                  </div>
                  <div className="master-list">
                    {masterOptions[type]
                      .filter(
                        (option) =>
                          type !== "work" ||
                          !FIXED_WORK_OPTIONS.includes(option.name),
                      )
                      .map((option) => (
                        <div
                          className={option.archivedAt ? "archived" : ""}
                          key={option.id}
                        >
                          <span>{option.name}</span>
                          <div>
                            {!option.archivedAt && (
                              <button
                                type="button"
                                onClick={() => saveMasterOption(type, option)}
                              >
                                編集
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleMasterArchive(type, option)}
                            >
                              {option.archivedAt ? "復元" : "非表示"}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </article>
              ))}
            </div>
            {siteMasters.some((site) => site.archivedAt) && (
              <details className="archived-sites">
                <summary>
                  非表示の現場（
                  {siteMasters.filter((site) => site.archivedAt).length}件）
                </summary>
                {siteMasters
                  .filter((site) => site.archivedAt)
                  .map((site) => (
                    <div key={site.id}>
                      <span>{site.site}</span>
                      <button type="button" onClick={() => restoreSite(site)}>
                        復元
                      </button>
                    </div>
                  ))}
              </details>
            )}
            {masterMessage && (
              <p className="calendar-message">{masterMessage}</p>
            )}
          </section>
        )}
        <footer>勤務データは自動で保存されます</footer>
      </div>
    </main>
  );
}


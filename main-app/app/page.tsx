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
import { splitUpcomingRecords } from "@/app/lib/group-records";
import {
  SITE_SEPARATOR,
  splitSites,
  japaneseHolidays,
  entrySiteRows,
  indexedEntrySiteRows,
  siteCardKey,
  parseJapaneseRegion,
  cardRegionInfo,
  parsePositionInput,
  addressFromCoordinates,
  splitNames,
  errorMessage,
  today,
  nextDate,
  emptyEntry,
  toMinutes,
  extraMinutes,
  workMinutes,
  startOfWeekSunday,
  shiftBoardRange,
  shiftBoardFingerprint,
  formatMinutes,
  formatDate,
} from "@/app/lib/entry-helpers";
import {
  isBeforeCurrentDate,
  isCurrentUsersPlan,
} from "@/app/lib/schedule-visibility";
import ShiftBoardTab from "@/app/components/ShiftBoardTab";
import SummaryTab from "@/app/components/SummaryTab";
import ToolsTab from "@/app/components/ToolsTab";
import HistoryPlansTab from "@/app/components/HistoryPlansTab";
import SitesTab from "@/app/components/SitesTab";
import EntryTab from "@/app/components/EntryTab";
import SettingsTab from "@/app/components/SettingsTab";
import type {
  WorkType,
  Entry,
  CalendarSettings,
  GoogleConnection,
  PaySettings,
  SiteCardData,
  SiteMaster,
  MasterOption,
  RegionInfo,
  ToolCategory,
  ToolChecklistItem,
  ToolChecklistSet,
  SiteDocument,
  ToolDragState,
  Skin,
  FontSize,
  AppTab,
  SummaryPeriod,
  SyncDashboard,
} from "@/app/types";

const APP_VERSION = "2.2.27";
const APP_UPDATED_AT = "2026年9月20日";
const CURRENT_USER_NAME = "子野井";
const defaultPaySettings: PaySettings = {
  dailyRate: "",
  standardHours: "8",
  overtimeMultiplier: "1.25",
  tripAllowance: "1500",
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
  const [moreOpen, setMoreOpen] = useState(false);
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
  const [skin, setSkin] = useState<Skin>("white");
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
        if (e instanceof Error && e.name !== "AbortError")
          setError(errorMessage(e, "履歴を読み込めませんでした"));
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetch("/api/masters?type=person")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "作業者マスターを読み込めませんでした");
        setMasterOptions((current) => ({ ...current, person: data.options }));
      })
      .catch((e) =>
        setMasterMessage(errorMessage(e, "作業者マスターを読み込めませんでした")),
      );
  }, []);

  useEffect(() => {
    if (activeTab !== "settings") return;
    fetch("/api/masters?type=work")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "作業内容マスターを読み込めませんでした");
        setMasterOptions((current) => ({ ...current, work: data.options }));
      })
      .catch((e) =>
        setMasterMessage(errorMessage(e, "作業内容マスターを読み込めませんでした")),
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
            setNewSiteMessage(errorMessage(e, "現場一覧を読み込めませんでした"));
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
            __counts__: errorMessage(error, "資料件数を読み込めませんでした"),
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
          if (!params.has("google") && data.warning)
            setGoogleConnectionMessage(data.warning);
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
        const paletteMigrated = localStorage.getItem("sakaguchi-attendance-skin-palette-v2") === "1";
        const nextSkin = !paletteMigrated && savedSkin === "green"
          ? "white"
          : !paletteMigrated && savedSkin === "dark"
            ? "black"
            : savedSkin;
        if (nextSkin && ["green", "black", "blue", "purple", "brown", "white"].includes(nextSkin))
          setSkin(nextSkin as Skin);
        localStorage.setItem("sakaguchi-attendance-skin-palette-v2", "1");
        const savedFontSize = localStorage.getItem(
          "sakaguchi-attendance-font-size",
        ) as FontSize | null;
        if (savedFontSize && ["small", "standard", "large", "extra-large", "maximum"].includes(savedFontSize))
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
      new Notification("坂口商会勤怠管理アプリ（個人用）｜入力のお知らせ", {
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
  const historyMonthEntries = useMemo(
    () =>
      monthEntries.filter((entry) =>
        isBeforeCurrentDate(entry.date, currentDate),
      ),
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
  const tomorrowDate = nextDate(currentDate);
  const belongsToCurrentUser = (entry: Entry) =>
    isCurrentUsersPlan(
      entrySiteRows(entry).map((row) => row.personnelNames),
      CURRENT_USER_NAME,
    );
  const visibleRecordEntries =
    activeTab === "plans"
      ? monthEntries
          .filter(
            (entry) => entry.date >= currentDate && belongsToCurrentUser(entry),
          )
          .sort((a, b) => a.date.localeCompare(b.date))
      : historyMonthEntries;
  const planBoardEntries = entries
    .filter(
      (entry) => entry.date >= currentDate && belongsToCurrentUser(entry),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const planBuckets = splitUpcomingRecords(planBoardEntries, currentDate, tomorrowDate);
  const planSections = [
    { id: "today", title: "今日の予定", date: currentDate, entries: planBuckets.today },
    { id: "tomorrow", title: "明日の予定", date: tomorrowDate, entries: planBuckets.tomorrow },
    { id: "later", title: "明日以降の予定", date: "", entries: planBuckets.later },
  ];
  const shiftBoardEntries = useMemo(
    () => [...completedMonthEntries].sort((a, b) => a.date.localeCompare(b.date)),
    [completedMonthEntries],
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
  const weeklyOvertimeMinutes = useMemo(() => {
    const weeklyNormalMinutes = new Map<string, number>();
    summaryEntries.forEach((entry) => {
      const extra = extraMinutes(entry);
      const normal = Math.max(
        0,
        workMinutes(entry) - extra.early - extra.overtime,
      );
      const week = startOfWeekSunday(entry.date);
      weeklyNormalMinutes.set(
        week,
        (weeklyNormalMinutes.get(week) ?? 0) + normal,
      );
    });
    let total = 0;
    weeklyNormalMinutes.forEach((minutes) => {
      total += Math.max(0, minutes - 40 * 60);
    });
    return total;
  }, [summaryEntries]);
  const estimatedPay = useMemo(() => {
    const dailyRate = Number(paySettings.dailyRate);
    const standardHours = Number(paySettings.standardHours);
    const multiplier = Number(paySettings.overtimeMultiplier);
    const tripAllowancePerDay = Number(paySettings.tripAllowance);
    if (!dailyRate || !standardHours || !multiplier) return null;
    const hourlyRate = dailyRate / standardHours;
    const base = Math.round(summary.days * dailyRate);
    const dailyExtra = Math.round(
      ((summary.early + summary.overtime) / 60) * hourlyRate * multiplier,
    );
    const weeklyExtra = Math.round(
      (weeklyOvertimeMinutes / 60) * hourlyRate * multiplier,
    );
    const tripAllowance = Math.round(
      summary.trips * (tripAllowancePerDay || 0),
    );
    return {
      base,
      extra: dailyExtra,
      weeklyExtra,
      tripAllowance,
      total: base + dailyExtra + weeklyExtra + tripAllowance,
    };
  }, [
    paySettings,
    summary.days,
    summary.early,
    summary.overtime,
    summary.trips,
    weeklyOvertimeMinutes,
  ]);
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
  const masterPersonnelNames = useMemo(
    () =>
      masterOptions.person
        .filter((option) => !option.archivedAt)
        .map((option) => option.name),
    [masterOptions.person],
  );
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
            errorMessage(error, "現場一覧へ登録できませんでした");
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
      setError(errorMessage(e, "保存できませんでした"));
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
          errorMessage(e, "照合できませんでした"),
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
        errorMessage(error, "現場を追加できませんでした"),
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
          errorMessage(error, "現場資料を読み込めませんでした"),
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
          errorMessage(error, "資料を保存できませんでした"),
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
          errorMessage(error, "資料を削除できませんでした"),
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

  function toggleAllPersonnel(index: number) {
    if (!masterPersonnelNames.length) return;
    const selected = splitNames(formPersonnelNames[index]);
    const allSelected = masterPersonnelNames.every((name) =>
      selected.includes(name),
    );
    const next = allSelected
      ? selected.filter((name) => !masterPersonnelNames.includes(name))
      : [...new Set([...selected, ...masterPersonnelNames])];
    updatePersonnelNames(index, next.join("、"));
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
      const response = await fetch("/api/tools");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "道具一覧を読み込めませんでした");
      setToolSets(data.sets);
    } catch (error) {
      setToolMessage(
        errorMessage(error, "道具一覧を読み込めませんでした"),
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
        errorMessage(error, "セットを追加できませんでした"),
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
        errorMessage(error, "道具を追加できませんでした"),
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
        errorMessage(error, "チェックを保存できませんでした"),
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
    let next: ToolChecklistSet[];
    if (type === "set") {
      const source = current.filter((set) => set.category === toolCategory);
      const index = source.findIndex((set) => set.id === id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= source.length)
        return false;
      const reordered = [...source];
      [reordered[index], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[index],
      ];
      let categoryIndex = 0;
      next = current.map((set) =>
        set.category === toolCategory
          ? { ...reordered[categoryIndex], sortOrder: categoryIndex++ }
          : set,
      );
    } else {
      const source = current.find((set) => set.id === setId)?.items ?? [];
      const index = source.findIndex((item) => item.id === id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= source.length)
        return false;
      const reordered = [...source];
      [reordered[index], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[index],
      ];
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
        errorMessage(error, "並び順を保存できませんでした"),
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
      !window.confirm(`${toolCategory}のチェックをすべて外しますか？`)
    )
      return;
    try {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", itemIds }),
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
      setToolMessage("チェックをリセットしました");
    } catch (error) {
      setToolMessage(
        errorMessage(error, "チェックをリセットできませんでした"),
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
        errorMessage(error, "保存できませんでした"),
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
        errorMessage(error, "更新できませんでした"),
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
        errorMessage(error, "編集できませんでした"),
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
        errorMessage(error, "非表示にできませんでした"),
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
        errorMessage(error, "削除できませんでした"),
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
              <strong>坂口商会勤怠管理アプリ（個人用）</strong>
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
              ["plans", "▣", "予定"],
              ["history", "◷", "記録"],
              ["sites", "⌂", "現場"],
              ["summary", "▥", "集計"],
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
          <div className="app-more">
            <button type="button" className={["tools", "shiftboard", "settings"].includes(activeTab) ? "active" : ""} aria-expanded={moreOpen} aria-controls="app-more-options" onClick={() => setMoreOpen((open) => !open)}>
              <span aria-hidden="true">☰</span>その他
            </button>
            {moreOpen && (
              <div className="app-more-options" id="app-more-options">
                {([
                  ["shiftboard", "▤", "シフトボード"],
                  ["tools", "✓", "道具チェック"],
                  ["settings", "⚙", "設定"],
                ] as [AppTab, string, string][]).map(([tab, icon, label]) => (
                  <button type="button" key={tab} onClick={() => { setActiveTab(tab); setMoreOpen(false); }}>
                    <span aria-hidden="true">{icon}</span>{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
        {activeTab === "settings" && (
          <SettingsTab
            googleConnection={googleConnection}
            googleSyncing={googleSyncing}
            syncExistingEntries={syncExistingEntries}
            spreadsheetUrl={spreadsheetUrl}
            disconnectGoogleAccount={disconnectGoogleAccount}
            googleClientId={googleClientId}
            setGoogleClientId={setGoogleClientId}
            googleClientSecret={googleClientSecret}
            setGoogleClientSecret={setGoogleClientSecret}
            saveGoogleConnectionSettings={saveGoogleConnectionSettings}
            googleConnectionMessage={googleConnectionMessage}
            syncDashboard={syncDashboard}
            reconcileGoogle={reconcileGoogle}
            retrySync={retrySync}
            selectedDuplicateIds={selectedDuplicateIds}
            setSelectedDuplicateIds={setSelectedDuplicateIds}
            cleanupDuplicates={cleanupDuplicates}
            restoreTrash={restoreTrash}
            syncManagerMessage={syncManagerMessage}
            skin={skin}
            setSkin={setSkin}
            fontSize={fontSize}
            setFontSize={setFontSize}
            appVersion={APP_VERSION}
            appUpdatedAt={APP_UPDATED_AT}
            notificationStatus={notificationStatus}
            enableNotifications={enableNotifications}
            fixedWorkOrder={fixedWorkOrder}
            moveFixedWork={moveFixedWork}
            masterDrafts={masterDrafts}
            setMasterDrafts={setMasterDrafts}
            saveMasterOption={saveMasterOption}
            masterOptions={masterOptions}
            FIXED_WORK_OPTIONS={FIXED_WORK_OPTIONS}
            toggleMasterArchive={toggleMasterArchive}
            siteMasters={siteMasters}
            restoreSite={restoreSite}
            masterMessage={masterMessage}
          />
        )}
        {activeTab === "entry" && (
          <EntryTab
            editingId={editingId}
            formIsPlanned={formIsPlanned}
            cancelEdit={cancelEdit}
            form={form}
            setForm={setForm}
            submit={submit}
            workTypes={workTypes}
            offEndDate={offEndDate}
            setOffEndDate={setOffEndDate}
            knownSites={knownSites}
            knownLocations={knownLocations}
            knownAddresses={knownAddresses}
            knownPersonnelNames={knownPersonnelNames}
            formSites={formSites}
            formLocations={formLocations}
            formAddresses={formAddresses}
            formCoordinates={formCoordinates}
            formPersonnelNames={formPersonnelNames}
            formWorks={formWorks}
            formStarts={formStarts}
            formEnds={formEnds}
            formNotes={formNotes}
            GARBAGE_DISPOSAL_TRIGGERS={GARBAGE_DISPOSAL_TRIGGERS}
            GARBAGE_DISPOSAL_OPTION={GARBAGE_DISPOSAL_OPTION}
            previousSiteVisits={previousSiteVisits}
            updateLocation={updateLocation}
            updateSite={updateSite}
            updateStart={updateStart}
            updateEnd={updateEnd}
            updatePosition={updatePosition}
            updatePersonnelNames={updatePersonnelNames}
            updateNote={updateNote}
            needsTime={needsTime}
            locatingSiteIndex={locatingSiteIndex}
            getCurrentAddress={getCurrentAddress}
            locationLookupMessages={locationLookupMessages}
            masterPersonnelNames={masterPersonnelNames}
            toggleAllPersonnel={toggleAllPersonnel}
            togglePersonnelName={togglePersonnelName}
            knownWorkOptions={knownWorkOptions}
            toggleWork={toggleWork}
            addSite={addSite}
            removeSite={removeSite}
            currentExtra={currentExtra}
            knownHotels={knownHotels}
            error={error}
            saving={saving}
          />
        )}

        {activeTab === "summary" && (
          <SummaryTab
            summaryPeriod={summaryPeriod}
            setSummaryPeriod={setSummaryPeriod}
            selectedYear={selectedYear}
            month={month}
            setMonth={setMonth}
            entries={entries}
            today={today}
            setBulkPlanMessage={setBulkPlanMessage}
            bulkPlanMessage={bulkPlanMessage}
            bulkPlanning={bulkPlanning}
            createBasicSchedule={createBasicSchedule}
            toggleHolidayRange={toggleHolidayRange}
            showHolidayRange={showHolidayRange}
            holidayRange={holidayRange}
            setHolidayRange={setHolidayRange}
            createHolidayRange={createHolidayRange}
            holidayRangeSaving={holidayRangeSaving}
            holidayRangeMessage={holidayRangeMessage}
            summary={summary}
            formatMinutes={formatMinutes}
            annualHotelNights={annualHotelNights}
            estimatedPay={estimatedPay}
            paySettings={paySettings}
            updatePaySettings={updatePaySettings}
            plannedMonthEntries={plannedMonthEntries}
            selfDinnerEntries={selfDinnerEntries}
            formatDate={formatDate}
            annualRankings={annualRankings}
          />
        )}

        {activeTab === "shiftboard" && (
          <ShiftBoardTab
            shiftBoardEntries={shiftBoardEntries}
            shiftBoardDone={shiftBoardDone}
            shiftBoardFingerprint={shiftBoardFingerprint}
            shiftBoardGroups={shiftBoardGroups}
            toggleShiftBoardDone={toggleShiftBoardDone}
            formatDate={formatDate}
            pendingShiftBoardEntries={pendingShiftBoardEntries}
            clearShiftBoardDone={clearShiftBoardDone}
            shiftBoardRow={shiftBoardRow}
            completedShiftBoardEntries={completedShiftBoardEntries}
            shiftBoardRange={shiftBoardRange}
          />
        )}

        {activeTab === "sites" && (
          <SitesTab
            siteCards={siteCards}
            siteCardSearch={siteCardSearch}
            setSiteCardSearch={setSiteCardSearch}
            filteredSiteCards={filteredSiteCards}
            siteCardSort={siteCardSort}
            setSiteCardSort={setSiteCardSort}
            siteAddressFilter={siteAddressFilter}
            setSiteAddressFilter={setSiteAddressFilter}
            siteDocumentFilter={siteDocumentFilter}
            setSiteDocumentFilter={setSiteDocumentFilter}
            showNewSite={showNewSite}
            setShowNewSite={setShowNewSite}
            newSiteMessage={newSiteMessage}
            setNewSiteMessage={setNewSiteMessage}
            newSiteDraft={newSiteDraft}
            setNewSiteDraft={setNewSiteDraft}
            useCurrentLocationForNewSite={useCurrentLocationForNewSite}
            createSiteMaster={createSiteMaster}
            newSiteSaving={newSiteSaving}
            siteLocationMessage={siteLocationMessage}
            editingSiteLocationKey={editingSiteLocationKey}
            siteNameMessage={siteNameMessage}
            editingSiteNameKey={editingSiteNameKey}
            groupedSiteCards={groupedSiteCards}
            siteDocumentsByKey={siteDocumentsByKey}
            siteDocumentCounts={siteDocumentCounts}
            coordinateAddresses={coordinateAddresses}
            coordinateRegions={coordinateRegions}
            loadSiteDocuments={loadSiteDocuments}
            openSiteNameEditor={openSiteNameEditor}
            openSiteLocationEditor={openSiteLocationEditor}
            archiveSite={archiveSite}
            siteNameDraft={siteNameDraft}
            setSiteNameDraft={setSiteNameDraft}
            saveSiteName={saveSiteName}
            siteNameSaving={siteNameSaving}
            siteLocationDraft={siteLocationDraft}
            setSiteLocationDraft={setSiteLocationDraft}
            useCurrentLocation={useCurrentLocation}
            saveSiteLocation={saveSiteLocation}
            siteLocationSaving={siteLocationSaving}
            siteDocumentUploadingKey={siteDocumentUploadingKey}
            uploadSiteDocuments={uploadSiteDocuments}
            deleteSiteDocument={deleteSiteDocument}
            siteDocumentLoadingKey={siteDocumentLoadingKey}
            siteDocumentMessages={siteDocumentMessages}
          />
        )}

        {activeTab === "tools" && (
          <ToolsTab
            checkedToolCount={checkedToolCount}
            visibleToolItems={visibleToolItems}
            toolCategory={toolCategory}
            setToolCategory={setToolCategory}
            visibleToolSets={visibleToolSets}
            toolsReady={toolsReady}
            loadTools={loadTools}
            toolDraggingKey={toolDraggingKey}
            beginToolDrag={beginToolDrag}
            moveToolDrag={moveToolDrag}
            finishToolDrag={finishToolDrag}
            editTool={editTool}
            deleteTool={deleteTool}
            toggleTool={toggleTool}
            newToolNames={newToolNames}
            setNewToolNames={setNewToolNames}
            addToolItem={addToolItem}
            newToolSetName={newToolSetName}
            setNewToolSetName={setNewToolSetName}
            addToolSet={addToolSet}
            resetToolChecks={resetToolChecks}
            toolMessage={toolMessage}
          />
        )}


        {(activeTab === "history" || activeTab === "plans") && (
          <HistoryPlansTab
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            historyView={historyView}
            setHistoryView={setHistoryView}
            month={month}
            setMonth={setMonth}
            visibleRecordEntries={visibleRecordEntries}
            planBoardEntries={planBoardEntries}
            selectedPlanIds={selectedPlanIds}
            setSelectedPlanIds={setSelectedPlanIds}
            removeMany={removeMany}
            ready={ready}
            calendarDays={calendarDays}
            calendarHolidays={calendarHolidays}
            edit={edit}
            planSections={planSections}
            siteDocumentsByKey={siteDocumentsByKey}
            siteDocumentLoadingKey={siteDocumentLoadingKey}
            siteDocumentMessages={siteDocumentMessages}
            loadSiteDocuments={loadSiteDocuments}
            remove={remove}
          />
        )}
        <footer>勤務データは自動で保存されます</footer>
      </div>
    </main>
  );
}

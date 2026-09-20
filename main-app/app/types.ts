export type WorkType = "1日" | "半日" | "休み";
export type Entry = {
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

export type CalendarSettings = {
  webhookUrl: string;
  syncKey: string;
  enabled: boolean;
};
export type GoogleConnection = {
  configured: boolean;
  connected: boolean;
  email: string;
  name: string;
  clientId: string;
  spreadsheetUrl: string;
};
export type PaySettings = {
  dailyRate: string;
  standardHours: string;
  overtimeMultiplier: string;
};
export type SiteCardData = {
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
export type SiteMaster = {
  id: number;
  site: string;
  location: string;
  address: string;
  coordinates: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string;
};
export type MasterOption = {
  id: number;
  type: "work" | "person";
  name: string;
  sortOrder: number;
  archivedAt: string;
};
export type RegionInfo = { prefecture: string; municipality: string };
export type ToolCategory = "通常業務" | "出張";
export type ToolChecklistItem = {
  id: number;
  setId: number;
  name: string;
  sortOrder: number;
  checked: boolean;
};
export type ToolChecklistSet = {
  id: number;
  category: ToolCategory;
  name: string;
  sortOrder: number;
  items: ToolChecklistItem[];
};
export type SiteDocument = {
  id: number;
  siteKey: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};
export type ToolDragState = {
  type: "set" | "item";
  setId: number;
  id: number;
  pointerId: number;
  lastY: number;
  active: boolean;
  timer: number;
};
export type Skin = "green" | "black" | "blue" | "purple" | "brown" | "white";
export type FontSize = "small" | "standard" | "large" | "extra-large" | "maximum";
export type AppTab =
  | "entry"
  | "history"
  | "plans"
  | "summary"
  | "sites"
  | "tools"
  | "shiftboard"
  | "settings";
export type SummaryPeriod = "monthly" | "annual";
export type SyncDashboard = {
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

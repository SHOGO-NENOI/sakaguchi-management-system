import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const attendanceEntries = sqliteTable("attendance_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workDate: text("work_date").notNull(),
  workType: text("work_type").notNull(),
  startTime: text("start_time").notNull().default(""),
  endTime: text("end_time").notNull().default(""),
  site: text("site").notNull().default(""),
  location: text("location").notNull().default(""),
  address: text("address").notNull().default(""),
  coordinates: text("coordinates").notNull().default(""),
  personnelNames: text("personnel_names").notNull().default(""),
  work: text("work").notNull().default(""),
  note: text("note").notNull().default(""),
  businessTrip: integer("business_trip", { mode: "boolean" }).notNull().default(false),
  dinnerType: text("dinner_type").notNull().default(""),
  hotelName: text("hotel_name").notNull().default(""),
  googleEventId: text("google_event_id").notNull().default(""),
  deletedAt: text("deleted_at").notNull().default(""),
  syncStatus: text("sync_status").notNull().default("pending"),
  syncError: text("sync_error").notNull().default(""),
  lastSyncedAt: text("last_synced_at").notNull().default(""),
  lastModifiedSource: text("last_modified_source").notNull().default("app"),
});

export const calendarSettings = sqliteTable("calendar_settings", {
  id: integer("id").primaryKey().default(1),
  webhookUrl: text("webhook_url").notNull().default(""),
  syncKey: text("sync_key").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
});

export const googleOAuthSettings = sqliteTable("google_oauth_settings", {
  id: integer("id").primaryKey().default(1),
  clientId: text("client_id").notNull().default(""),
  clientSecretEncrypted: text("client_secret_encrypted").notNull().default(""),
  accessTokenEncrypted: text("access_token_encrypted").notNull().default(""),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull().default(""),
  accessTokenExpiresAt: integer("access_token_expires_at").notNull().default(0),
  connectedEmail: text("connected_email").notNull().default(""),
  connectedName: text("connected_name").notNull().default(""),
  connectedAt: text("connected_at").notNull().default(""),
  spreadsheetId: text("spreadsheet_id").notNull().default(""),
  spreadsheetUrl: text("spreadsheet_url").notNull().default(""),
  driveFolderId: text("drive_folder_id").notNull().default(""),
  lastCalendarSyncAt: text("last_calendar_sync_at").notNull().default(""),
  syncLockUntil: integer("sync_lock_until").notNull().default(0),
});

export const toolSets = sqliteTable("tool_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: text("archived_at").notNull().default(""),
}, (table) => [uniqueIndex("tool_sets_category_name_unique").on(table.category, table.name)]);

export const toolItems = sqliteTable("tool_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  setId: integer("set_id").notNull().references(() => toolSets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: text("archived_at").notNull().default(""),
}, (table) => [uniqueIndex("tool_items_set_name_unique").on(table.setId, table.name)]);

export const toolChecks = sqliteTable("tool_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  checkDate: text("check_date").notNull(),
  itemId: integer("item_id").notNull().references(() => toolItems.id, { onDelete: "cascade" }),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
}, (table) => [uniqueIndex("tool_checks_date_item_unique").on(table.checkDate, table.itemId)]);

export const siteDocuments = sqliteTable("site_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteKey: text("site_key").notNull(),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
}, (table) => [uniqueIndex("site_documents_object_key_unique").on(table.objectKey)]);

export const siteMasters = sqliteTable("site_masters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  site: text("site").notNull(),
  location: text("location").notNull().default(""),
  address: text("address").notNull().default(""),
  coordinates: text("coordinates").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  archivedAt: text("archived_at").notNull().default(""),
});

export const masterOptions = sqliteTable("master_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: text("archived_at").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("master_options_type_name_unique").on(table.type, table.name)]);

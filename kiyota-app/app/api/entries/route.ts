import { and, desc, eq, inArray, lt, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { attendanceEntries } from "../../../db/schema";
import { syncGoogleCalendar } from "./google-calendar";
import { requireAuthorizedApiUser } from "../../authorized-user";

type Payload = {
  id?: number;
  date?: string;
  type?: string;
  start?: string;
  end?: string;
  site?: string;
  location?: string;
  address?: string;
  coordinates?: string;
  personnelNames?: string;
  work?: string;
  note?: string;
  businessTrip?: boolean;
  dinnerType?: string;
  hotelName?: string;
  calendarEndDate?: string;
  suppressCalendar?: boolean;
};

const normalizedWorkType = (workType: string) => ["有給", "公休", "雨天中止", "欠勤"].includes(workType) ? "休み" : workType;
const normalizedDinnerType = (dinnerType: string) => dinnerType === "自腹" ? "自費" : dinnerType;

const mapEntry = (row: typeof attendanceEntries.$inferSelect) => ({
  id: String(row.id), date: row.workDate, type: normalizedWorkType(row.workType),
  start: row.startTime, end: row.endTime, site: row.site, location: row.location,
  address: row.address, coordinates: row.coordinates,
  personnelNames: row.personnelNames, work: row.work, note: row.note,
  businessTrip: row.businessTrip, dinnerType: normalizedDinnerType(row.dinnerType), hotelName: row.hotelName,
  googleEventId: row.googleEventId,
  deletedAt: row.deletedAt, syncStatus: row.syncStatus, syncError: row.syncError,
  lastSyncedAt: row.lastSyncedAt, lastModifiedSource: row.lastModifiedSource,
});

function values(payload: Payload) {
  if (!payload.date || !payload.type) throw new Error("日付と勤務区分は必須です");
  const workType = normalizedWorkType(payload.type);
  return {
    workDate: payload.date, workType, startTime: payload.start ?? "",
    endTime: payload.end ?? "", site: payload.site?.trim() ?? "", location: payload.location?.trim() ?? "",
    address: payload.address?.trim() ?? "", coordinates: payload.coordinates?.trim() ?? "",
    personnelNames: payload.personnelNames?.trim() ?? "",
    work: payload.work?.trim() ?? "", note: workType === "休み" ? payload.note?.trim() || "休み" : payload.note?.trim() ?? "",
    businessTrip: payload.businessTrip ?? false,
    dinnerType: "",
    hotelName: payload.businessTrip ? payload.hotelName?.trim() ?? "" : "",
  };
}

export async function GET(request: Request) {
  const authError = await requireAuthorizedApiUser(); if (authError) return authError;
  const db = await getDb();
  await db.update(attendanceEntries).set({ workType: "休み" }).where(eq(attendanceEntries.workType, "欠勤"));
  const trashCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.delete(attendanceEntries).where(and(ne(attendanceEntries.deletedAt, ""), lt(attendanceEntries.deletedAt, trashCutoff)));
  const trash = new URL(request.url).searchParams.get("trash") === "1";
  const rows = await db.select().from(attendanceEntries).where(trash ? ne(attendanceEntries.deletedAt, "") : eq(attendanceEntries.deletedAt, "")).orderBy(desc(attendanceEntries.workDate), desc(attendanceEntries.id));
  return Response.json({ entries: rows.map(mapEntry) });
}

export async function POST(request: Request) {
  const authError = await requireAuthorizedApiUser(); if (authError) return authError;
  try {
    const payload = await request.json() as Payload;
    const db = await getDb();
    let [row] = await db.insert(attendanceEntries).values(values(payload)).returning();
    let warning = "";
    try {
      const sync = await syncGoogleCalendar(row, "upsert", { calendarEndDate: payload.calendarEndDate, suppressCalendar: payload.suppressCalendar });
      if (sync.synced) [row] = await db.update(attendanceEntries).set({ googleEventId: sync.eventId, syncStatus: "synced", syncError: "", lastSyncedAt: new Date().toISOString(), lastModifiedSource: "app" }).where(eq(attendanceEntries.id, row.id)).returning();
    } catch (error) { warning = error instanceof Error ? error.message : "Googleカレンダーに反映できませんでした"; [row] = await db.update(attendanceEntries).set({ syncStatus: "error", syncError: warning }).where(eq(attendanceEntries.id, row.id)).returning(); }
    return Response.json({ entry: mapEntry(row), warning }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存できませんでした" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const authError = await requireAuthorizedApiUser(); if (authError) return authError;
  try {
    const payload = await request.json() as Payload;
    if (!payload.id) throw new Error("編集する記録が見つかりません");
    const db = await getDb();
    let [row] = await db.update(attendanceEntries).set(values(payload)).where(eq(attendanceEntries.id, payload.id)).returning();
    let warning = "";
    try {
      const sync = await syncGoogleCalendar(row, "upsert", { calendarEndDate: payload.calendarEndDate, suppressCalendar: payload.suppressCalendar });
      if (sync.synced) [row] = await db.update(attendanceEntries).set({ googleEventId: sync.eventId, syncStatus: "synced", syncError: "", lastSyncedAt: new Date().toISOString(), lastModifiedSource: "app" }).where(eq(attendanceEntries.id, row.id)).returning();
    } catch (error) { warning = error instanceof Error ? error.message : "Googleカレンダーに反映できませんでした"; [row] = await db.update(attendanceEntries).set({ syncStatus: "error", syncError: warning }).where(eq(attendanceEntries.id, row.id)).returning(); }
    return Response.json({ entry: mapEntry(row), warning });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新できませんでした" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const authError = await requireAuthorizedApiUser(); if (authError) return authError;
  const body = await request.json() as { id?: number; ids?: number[] };
  const ids = [...new Set([...(body.ids ?? []), ...(body.id ? [body.id] : [])])].filter(Number.isInteger);
  if (!ids.length) return Response.json({ error: "削除する記録が見つかりません" }, { status: 400 });
  const db = await getDb();
  const rows = await db.select().from(attendanceEntries).where(and(inArray(attendanceEntries.id, ids), eq(attendanceEntries.deletedAt, "")));
  const failed: { id: number; error: string }[] = []; const deleted: number[] = [];
  for (const row of rows) try { await syncGoogleCalendar(row, "delete"); await db.update(attendanceEntries).set({ deletedAt: new Date().toISOString(), syncStatus: "synced", syncError: "", lastSyncedAt: new Date().toISOString(), lastModifiedSource: "app" }).where(eq(attendanceEntries.id, row.id)); deleted.push(row.id); }
  catch (error) { const message = error instanceof Error ? error.message : "Googleから削除できませんでした"; await db.update(attendanceEntries).set({ syncStatus: "error", syncError: message }).where(eq(attendanceEntries.id, row.id)); failed.push({ id: row.id, error: message }); }
  return Response.json({ ok: failed.length === 0, deleted, failed }, { status: failed.length ? 409 : 200 });
}

export async function PATCH(request: Request) {
  const authError = await requireAuthorizedApiUser(); if (authError) return authError;
  const body = await request.json() as { ids?: number[]; action?: "restore" | "purge" }; const ids = [...new Set(body.ids ?? [])].filter(Number.isInteger);
  if (!ids.length) return Response.json({ error: "対象の記録がありません" }, { status: 400 });
  const db = await getDb();
  if (body.action === "purge") { await db.delete(attendanceEntries).where(and(inArray(attendanceEntries.id, ids), ne(attendanceEntries.deletedAt, ""))); return Response.json({ ok: true, purged: ids.length }); }
  const rows = await db.select().from(attendanceEntries).where(inArray(attendanceEntries.id, ids)); const restored: number[] = []; const failed: { id: number; error: string }[] = [];
  for (const row of rows) try { const sync = await syncGoogleCalendar({ ...row, deletedAt: "", googleEventId: "" }, "upsert"); await db.update(attendanceEntries).set({ deletedAt: "", googleEventId: sync.eventId, syncStatus: "synced", syncError: "", lastSyncedAt: new Date().toISOString(), lastModifiedSource: "app" }).where(eq(attendanceEntries.id, row.id)); restored.push(row.id); } catch (error) { failed.push({ id: row.id, error: error instanceof Error ? error.message : "復元できませんでした" }); }
  return Response.json({ ok: failed.length === 0, restored, failed }, { status: failed.length ? 409 : 200 });
}

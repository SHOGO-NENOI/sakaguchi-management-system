import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { attendanceEntries, googleOAuthSettings } from "../../../../db/schema";
import { googleFetch } from "../../../lib/google-api";
import { ensureOperationalSchema } from "../../../lib/operational-schema";
import { appendAudit } from "../../../lib/audit";
import { syncGoogleCalendar, syncSheet } from "../../entries/google-calendar";

type GoogleEvent = {
  id: string; status?: string; summary?: string; description?: string; location?: string; updated?: string;
  start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
};

function replacePart(value: string, index: number, next: string) { const values = value.split("｜"); while (values.length <= index) values.push(""); values[index] = next; return values.join("｜"); }
function dateTimePart(value?: string) { if (!value) return { date: "", time: "" }; const matched = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/); return { date: matched?.[1] ?? "", time: matched?.[2] ?? "" }; }
function details(description = "") { return Object.fromEntries(description.split("\n").map((line) => { const index = line.indexOf("："); return index > 0 ? [line.slice(0, index), line.slice(index + 1)] : ["", ""]; }).filter(([key]) => key)); }
function summaryDetails(summary = "") { const match = summary.replace(/^【予定】/, "").match(/^(.*?)【(.*?)】$/); if (!match) return null; const place = match[1] === "現場未入力" ? [] : match[1].split("@"); return { location: place[0] ?? "", site: place[1] ?? "", work: match[2] ?? "" }; }
function fingerprint(event: GoogleEvent) { return [event.summary ?? "", event.start?.dateTime ?? event.start?.date ?? "", event.end?.dateTime ?? event.end?.date ?? "", event.location ?? ""].join("|"); }
function isAppEvent(event: GoogleEvent) { return event.extendedProperties?.private?.sakaguchiSource === "attendance-app" || (event.description?.includes("記録状態：") && event.description.includes("勤務区分：")); }
function addDay(value: string) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }
function isSunday(value: string) { return new Date(`${value}T00:00:00Z`).getUTCDay() === 0; }
function isOffType(value: string) { return ["休み", "有給", "公休", "雨天中止", "欠勤"].includes(value); }

async function calendarEvents() {
  const from = new Date(); from.setFullYear(from.getFullYear() - 2);
  const to = new Date(); to.setFullYear(to.getFullYear() + 2);
  const params = new URLSearchParams({ singleEvents: "true", showDeleted: "true", maxResults: "2500", timeMin: from.toISOString(), timeMax: to.toISOString() });
  const response = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`);
  return (await response.json() as { items?: GoogleEvent[] }).items ?? [];
}

function duplicateGroups(events: GoogleEvent[], linkedIds: Set<string>) {
  const groups = new Map<string, GoogleEvent[]>();
  events.filter((event) => event.status !== "cancelled" && isAppEvent(event)).forEach((event) => { const key = fingerprint(event); (groups.get(key) ?? groups.set(key, []).get(key)!).push(event); });
  return [...groups.values()].filter((group) => group.length > 1).map((group) => {
    const keep = group.find((event) => linkedIds.has(event.id)) ?? group[0];
    return { keepEventId: keep.id, duplicateEventIds: group.filter((event) => event.id !== keep.id).map((event) => event.id), summary: keep.summary ?? "予定", start: keep.start?.dateTime ?? keep.start?.date ?? "" };
  });
}

export async function GET() {
  try {
    await ensureOperationalSchema();
    const db = await getDb();
    const rows = await db.select().from(attendanceEntries);
    const active = rows.filter((row) => !row.deletedAt);
    const events = await calendarEvents();
    const linkedIds = new Set(active.flatMap((row) => row.googleEventId.split("｜").filter(Boolean)));
    const duplicates = duplicateGroups(events, linkedIds);
    return Response.json({
      connected: true,
      synced: active.filter((row) => row.syncStatus === "synced").length,
      pending: active.filter((row) => row.syncStatus === "pending").length,
      errors: active.filter((row) => row.syncStatus === "error").map((row) => ({ id: row.id, date: row.workDate, site: row.site, error: row.syncError })),
      duplicates,
      trash: rows.filter((row) => row.deletedAt).map((row) => ({ id: row.id, date: row.workDate, site: row.site, deletedAt: row.deletedAt, source: row.lastModifiedSource })),
      lastSyncAt: (await db.query.googleOAuthSettings.findFirst({ where: eq(googleOAuthSettings.id, 1) }))?.lastCalendarSyncAt ?? "",
    });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "同期状態を確認できませんでした" }, { status: 400 }); }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { action?: "reconcile" | "retry" | "cleanup"; eventIds?: string[]; entryIds?: number[] };
  try {
    await ensureOperationalSchema();
    const db = await getDb();
    if (body.action === "cleanup") {
      const eventIds = [...new Set(body.eventIds ?? [])].filter(Boolean);
      for (const eventId of eventIds) await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
      return Response.json({ ok: true, deleted: eventIds.length });
    }
    if (body.action === "retry") {
      const rows = await db.select().from(attendanceEntries).where(and(inArray(attendanceEntries.id, body.entryIds ?? []), eq(attendanceEntries.deletedAt, "")));
      const failed: { id: number; error: string }[] = [];
      for (const row of rows) try { const result = await syncGoogleCalendar(row, "upsert"); await db.update(attendanceEntries).set({ googleEventId: result.eventId, syncStatus: "synced", syncError: "", lastSyncedAt: new Date().toISOString() }).where(eq(attendanceEntries.id, row.id)); } catch (error) { failed.push({ id: row.id, error: error instanceof Error ? error.message : "再同期できませんでした" }); }
      return Response.json({ ok: failed.length === 0, failed }, { status: failed.length ? 409 : 200 });
    }
    const now = Date.now();
    const settings = await db.query.googleOAuthSettings.findFirst({ where: eq(googleOAuthSettings.id, 1) });
    if (settings?.syncLockUntil && settings.syncLockUntil > now) return Response.json({ error: "同期処理を実行中です。完了までお待ちください" }, { status: 409 });
    await db.update(googleOAuthSettings).set({ syncLockUntil: now + 5 * 60_000 }).where(eq(googleOAuthSettings.id, 1));
    try {
      const rows = await db.select().from(attendanceEntries).where(eq(attendanceEntries.deletedAt, ""));
      const events = await calendarEvents();
      const eventMap = new Map(events.map((event) => [event.id, event]));
      let updated = 0, calendarRemoved = 0, calendarNormalized = 0;
      const normalizedOffRows = new Set<number>();
      for (const row of rows.filter((item) => isOffType(item.workType))) {
        const ids = row.googleEventId.split("｜").filter(Boolean);
        const linked = ids.map((id) => eventMap.get(id)).filter(Boolean) as GoogleEvent[];
        const shouldHide = isSunday(row.workDate);
        const hasLegacyRange = linked.some((event) => event.start?.date !== row.workDate || event.end?.date !== addDay(row.workDate));
        if ((shouldHide && ids.length) || (!shouldHide && (!ids.length || linked.length !== ids.length || hasLegacyRange))) {
          const result = await syncGoogleCalendar(row, "upsert");
          await db.update(attendanceEntries).set({ googleEventId: result.eventId, syncStatus: "synced", syncError: "", lastSyncedAt: new Date().toISOString(), lastModifiedSource: "app" }).where(eq(attendanceEntries.id, row.id));
          normalizedOffRows.add(row.id);
          calendarNormalized += 1;
        }
      }
      for (const row of rows) {
        if (normalizedOffRows.has(row.id)) continue;
        const ids = row.googleEventId.split("｜").filter(Boolean);
        if (!ids.length) continue;
        const linked = ids.map((id) => eventMap.get(id)).filter(Boolean) as GoogleEvent[];
        if (linked.some((event) => event.status === "cancelled") || linked.length < ids.length) {
          await db.update(attendanceEntries).set({
            syncStatus: "error",
            syncError: "Googleカレンダー側の予定が削除されています。再実行すると予定を作り直します",
            lastSyncedAt: new Date().toISOString(),
            lastModifiedSource: "google",
          }).where(eq(attendanceEntries.id, row.id));
          calendarRemoved += 1; continue;
        }
        const changes: Partial<typeof attendanceEntries.$inferInsert> = {};
        linked.forEach((event, index) => {
          if (!event.updated || (row.lastSyncedAt && event.updated <= row.lastSyncedAt)) return;
          const info = details(event.description);
          const title = summaryDetails(event.summary);
          const start = dateTimePart(event.start?.dateTime); const end = dateTimePart(event.end?.dateTime);
          if (start.date || event.start?.date) changes.workDate = start.date || event.start?.date;
          if (start.time) changes.startTime = replacePart(changes.startTime ?? row.startTime, index, start.time);
          if (end.time) changes.endTime = replacePart(changes.endTime ?? row.endTime, index, end.time);
          if (title) { changes.location = replacePart(changes.location ?? row.location, index, title.location); changes.site = replacePart(changes.site ?? row.site, index, title.site); changes.work = replacePart(changes.work ?? row.work, index, title.work); }
          else if (info["現場"]) { const [location, site] = info["現場"].split("@"); changes.location = replacePart(changes.location ?? row.location, index, location ?? ""); changes.site = replacePart(changes.site ?? row.site, index, site ?? ""); }
          if (!title && info["作業内容"]) changes.work = replacePart(changes.work ?? row.work, index, info["作業内容"]);
          if (info["作業者"]) changes.personnelNames = replacePart(changes.personnelNames ?? row.personnelNames, index, info["作業者"]);
          if (info["メモ"]) changes.note = replacePart(changes.note ?? row.note, index, info["メモ"]);
          if (event.location) changes.address = replacePart(changes.address ?? row.address, index, event.location);
        });
        if (Object.keys(changes).length) {
          const updatedAt = new Date().toISOString();
          const next = { ...row, ...changes, updatedAt, syncStatus: "synced", syncError: "", lastSyncedAt: updatedAt, lastModifiedSource: "google" };
          await db.update(attendanceEntries).set({ ...changes, updatedAt, syncStatus: "synced", syncError: "", lastSyncedAt: updatedAt, lastModifiedSource: "google" }).where(eq(attendanceEntries.id, row.id));
          await syncSheet(next, "upsert"); updated += 1;
          await appendAudit({ action: "update", targetType: "entry", targetId: row.id, targetName: `${next.workDate} ${next.site || next.workType}`, actorName: "Googleカレンダー", before: row, after: next });
        }
      }
      const completedAt = new Date().toISOString();
      await db.update(googleOAuthSettings).set({ lastCalendarSyncAt: completedAt, syncLockUntil: 0 }).where(eq(googleOAuthSettings.id, 1));
      return Response.json({ ok: true, updated, calendarRemoved, calendarNormalized, trashed: 0, duplicates: duplicateGroups(events, new Set(rows.flatMap((row) => row.googleEventId.split("｜").filter(Boolean)))) });
    } catch (error) { await db.update(googleOAuthSettings).set({ syncLockUntil: 0 }).where(eq(googleOAuthSettings.id, 1)); throw error; }
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "双方向同期に失敗しました" }, { status: 400 }); }
}

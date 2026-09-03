import { and, eq, lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { attendanceEntries, calendarSettings, googleOAuthSettings } from "../../../db/schema";
import { syncGoogleCalendar } from "../entries/google-calendar";

export async function GET() {
  const db = await getDb();
  const row = await db.query.calendarSettings.findFirst({ where: eq(calendarSettings.id, 1) });
  return Response.json({ settings: row ?? { id: 1, webhookUrl: "", syncKey: "", enabled: false } });
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as { webhookUrl?: string; syncKey?: string; enabled?: boolean };
    const webhookUrl = payload.webhookUrl?.trim() ?? "";
    const syncKey = payload.syncKey?.trim() ?? "";
    if (payload.enabled && (!webhookUrl.startsWith("https://script.google.com/") || !syncKey)) {
      throw new Error("Google Apps ScriptのURLと連携キーを入力してください");
    }
    const db = await getDb();
    const [settings] = await db.insert(calendarSettings).values({ id: 1, webhookUrl, syncKey, enabled: payload.enabled ?? false })
      .onConflictDoUpdate({ target: calendarSettings.id, set: { webhookUrl, syncKey, enabled: payload.enabled ?? false } }).returning();
    return Response.json({ settings });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "設定を保存できませんでした" }, { status: 400 });
  }
}

export async function POST() {
  try {
    const db = await getDb();
    const now = Date.now();
    const [lock] = await db.update(googleOAuthSettings).set({ syncLockUntil: now + 10 * 60_000 }).where(and(eq(googleOAuthSettings.id, 1), lt(googleOAuthSettings.syncLockUntil, now))).returning();
    if (!lock) return Response.json({ error: "同期処理を実行中です。完了までお待ちください" }, { status: 409 });
    const rows = await db.select().from(attendanceEntries).where(eq(attendanceEntries.deletedAt, ""));
    let synced = 0;
    let spreadsheetUrl = "";
    for (const sourceRow of rows) {
      const result = await syncGoogleCalendar(sourceRow, "upsert");
      if (result.synced) {
        synced += 1;
        if (result.spreadsheetUrl) spreadsheetUrl = result.spreadsheetUrl;
        await db.update(attendanceEntries).set({ googleEventId: result.eventId, syncStatus: "synced", syncError: "", lastSyncedAt: new Date().toISOString(), lastModifiedSource: "app" }).where(eq(attendanceEntries.id, sourceRow.id));
      }
    }
    await db.update(googleOAuthSettings).set({ syncLockUntil: 0, lastCalendarSyncAt: new Date().toISOString() }).where(eq(googleOAuthSettings.id, 1));
    return Response.json({ ok: true, synced, spreadsheetUrl });
  } catch (error) {
    try { const db = await getDb(); await db.update(googleOAuthSettings).set({ syncLockUntil: 0 }).where(eq(googleOAuthSettings.id, 1)); } catch { }
    return Response.json({ error: error instanceof Error ? error.message : "既存履歴を同期できませんでした" }, { status: 400 });
  }
}

import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  attendanceEntries,
  masterOptions,
  siteDocuments,
  siteMasters,
  toolItems,
  toolSets,
} from "../../../db/schema";
import { appendAudit } from "@/app/lib/audit";
import { ensureOperationalSchema } from "@/app/lib/operational-schema";
import { syncGoogleCalendar } from "@/app/api/entries/google-calendar";

type TrashKind = "entry" | "site" | "master" | "toolSet" | "toolItem" | "document";

export async function GET() {
  try {
    await ensureOperationalSchema();
    const db = await getDb();
    const [entries, sites, masters, sets, items, documents] = await Promise.all([
      db.select().from(attendanceEntries).where(ne(attendanceEntries.deletedAt, "")).orderBy(desc(attendanceEntries.deletedAt)),
      db.select().from(siteMasters).where(ne(siteMasters.archivedAt, "")).orderBy(desc(siteMasters.archivedAt)),
      db.select().from(masterOptions).where(ne(masterOptions.archivedAt, "")).orderBy(desc(masterOptions.archivedAt)),
      db.select().from(toolSets).where(ne(toolSets.archivedAt, "")).orderBy(desc(toolSets.archivedAt)),
      db.select().from(toolItems).where(ne(toolItems.archivedAt, "")).orderBy(desc(toolItems.archivedAt)),
      db.select().from(siteDocuments).where(ne(siteDocuments.archivedAt, "")).orderBy(desc(siteDocuments.archivedAt)),
    ]);
    const result = [
      ...entries.map((item) => ({ kind: "entry", id: item.id, name: `${item.workDate} ${item.site || item.workType}`, archivedAt: item.deletedAt })),
      ...sites.map((item) => ({ kind: "site", id: item.id, name: item.site, archivedAt: item.archivedAt })),
      ...masters.map((item) => ({ kind: "master", id: item.id, name: `${item.type === "person" ? "作業者" : "作業"}：${item.name}`, archivedAt: item.archivedAt })),
      ...sets.map((item) => ({ kind: "toolSet", id: item.id, name: `道具セット：${item.name}`, archivedAt: item.archivedAt })),
      ...items.map((item) => ({ kind: "toolItem", id: item.id, name: `道具：${item.name}`, archivedAt: item.archivedAt })),
      ...documents.map((item) => ({ kind: "document", id: item.id, name: `資料：${item.fileName}`, archivedAt: item.archivedAt })),
    ].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
    return Response.json({ items: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "削除データを読み込めませんでした" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureOperationalSchema();
    const body = await request.json() as { kind?: TrashKind; id?: number };
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("復元するデータを確認してください");
    const db = await getDb();
    let restoredName = "";
    if (body.kind === "entry") {
      const [before] = await db.select().from(attendanceEntries).where(and(eq(attendanceEntries.id, id), ne(attendanceEntries.deletedAt, ""))).limit(1);
      if (before) {
        const sync = await syncGoogleCalendar({ ...before, deletedAt: "", googleEventId: "" }, "upsert");
        const [row] = await db.update(attendanceEntries).set({
          deletedAt: "",
          googleEventId: sync.eventId,
          syncStatus: "synced",
          syncError: "",
          lastSyncedAt: new Date().toISOString(),
          lastModifiedSource: "app",
          updatedAt: new Date().toISOString(),
        }).where(eq(attendanceEntries.id, id)).returning();
        restoredName = row ? `${row.workDate} ${row.site || row.workType}` : "";
      }
    } else if (body.kind === "site") {
      const [row] = await db.update(siteMasters).set({ archivedAt: "", updatedAt: new Date().toISOString() }).where(and(eq(siteMasters.id, id), ne(siteMasters.archivedAt, ""))).returning();
      restoredName = row?.site ?? "";
    } else if (body.kind === "master") {
      const [row] = await db.update(masterOptions).set({ archivedAt: "", updatedAt: new Date().toISOString() }).where(and(eq(masterOptions.id, id), ne(masterOptions.archivedAt, ""))).returning();
      restoredName = row?.name ?? "";
    } else if (body.kind === "toolSet") {
      const [row] = await db.update(toolSets).set({ archivedAt: "" }).where(and(eq(toolSets.id, id), ne(toolSets.archivedAt, ""))).returning();
      restoredName = row?.name ?? "";
    } else if (body.kind === "toolItem") {
      const [row] = await db.update(toolItems).set({ archivedAt: "" }).where(and(eq(toolItems.id, id), ne(toolItems.archivedAt, ""))).returning();
      restoredName = row?.name ?? "";
    } else if (body.kind === "document") {
      const [row] = await db.update(siteDocuments).set({ archivedAt: "" }).where(and(eq(siteDocuments.id, id), ne(siteDocuments.archivedAt, ""))).returning();
      restoredName = row?.fileName ?? "";
    } else throw new Error("復元するデータの種類が正しくありません");
    if (!restoredName) return Response.json({ error: "削除済みデータが見つかりません" }, { status: 404 });
    await appendAudit({ action: "restore", targetType: body.kind, targetId: id, targetName: restoredName });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "復元できませんでした" }, { status: 400 });
  }
}

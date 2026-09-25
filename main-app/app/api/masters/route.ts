import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { attendanceEntries, masterOptions } from "../../../db/schema";
import { appendAudit } from "../../lib/audit";
import { ensureOperationalSchema } from "../../lib/operational-schema";

type MasterType = "work" | "person";
type Payload = { action?: "add" | "edit" | "archive" | "restore" | "reorder"; type?: MasterType; id?: number; name?: string; orderedIds?: number[]; expectedUpdatedAt?: string };
const validType = (value: unknown): value is MasterType => value === "work" || value === "person";
const splitSites = (value: string) => value.split("｜").map((part) => part.trim()).filter(Boolean);
const splitPeople = (value: string) => splitSites(value).flatMap((part) => part.split(/[、,，\n]/).map((name) => name.trim()).filter(Boolean));

async function seedHistory(type: MasterType) {
  const db = await getDb();
  const [existing] = await db.select({ id: masterOptions.id }).from(masterOptions).where(eq(masterOptions.type, type)).limit(1);
  if (existing) return;
  const rows = await db.select({ work: attendanceEntries.work, personnelNames: attendanceEntries.personnelNames }).from(attendanceEntries);
  const names = [...new Set(rows.flatMap((row) => type === "work" ? splitSites(row.work) : splitPeople(row.personnelNames)))];
  const now = new Date().toISOString();
  for (let index = 0; index < names.length; index += 1) {
    await db.insert(masterOptions).values({ type, name: names[index], sortOrder: index, createdAt: now, updatedAt: now }).onConflictDoNothing();
  }
}

export async function GET(request: Request) {
  try {
    await ensureOperationalSchema();
    const type = new URL(request.url).searchParams.get("type");
    if (!validType(type)) throw new Error("マスターの種類が正しくありません");
    await seedHistory(type);
    const db = await getDb();
    return Response.json({ options: await db.select().from(masterOptions).where(eq(masterOptions.type, type)).orderBy(asc(masterOptions.sortOrder), asc(masterOptions.id)) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "読み込めませんでした" }, { status: 400 }); }
}

export async function POST(request: Request) {
  try {
    await ensureOperationalSchema();
    const body = await request.json() as Payload;
    if (!validType(body.type)) throw new Error("マスターの種類が正しくありません");
    const db = await getDb();
    const now = new Date().toISOString();
    if (body.action === "add") {
      const name = body.name?.trim(); if (!name) throw new Error("名前を入力してください");
      const [last] = await db.select({ sortOrder: masterOptions.sortOrder }).from(masterOptions).where(eq(masterOptions.type, body.type)).orderBy(desc(masterOptions.sortOrder)).limit(1);
      const [existing] = await db.select().from(masterOptions).where(and(eq(masterOptions.type, body.type), eq(masterOptions.name, name))).limit(1);
      if (existing) {
        if (!existing.archivedAt) throw new Error("同じ名前がすでにあります");
        const [option] = await db.update(masterOptions).set({ archivedAt: "", sortOrder: (last?.sortOrder ?? -1) + 1, updatedAt: now }).where(eq(masterOptions.id, existing.id)).returning();
        return Response.json({ option, restored: true });
      }
      const [option] = await db.insert(masterOptions).values({ type: body.type, name, sortOrder: (last?.sortOrder ?? -1) + 1, createdAt: now, updatedAt: now }).returning();
      await appendAudit({ action: "create", targetType: `master:${body.type}`, targetId: option.id, targetName: option.name, after: option });
      return Response.json({ option }, { status: 201 });
    }
    if (!body.id) throw new Error("対象が見つかりません");
    if (body.action === "edit") {
      const name = body.name?.trim(); if (!name) throw new Error("名前を入力してください");
      const [duplicate] = await db.select({ id: masterOptions.id }).from(masterOptions).where(and(eq(masterOptions.type, body.type), eq(masterOptions.name, name))).limit(1);
      if (duplicate && duplicate.id !== body.id) throw new Error("同じ名前がすでにあります");
      const [before] = await db.select().from(masterOptions).where(and(eq(masterOptions.id, body.id), eq(masterOptions.type, body.type))).limit(1);
      if (!before) throw new Error("対象が見つかりません");
      if ((body.expectedUpdatedAt ?? "") !== before.updatedAt) {
        return Response.json({ error: "別の端末で先に更新されています。画面を再読み込みしてください", conflict: true, option: before }, { status: 409 });
      }
      const [option] = await db.update(masterOptions).set({ name, updatedAt: now }).where(and(eq(masterOptions.id, body.id), eq(masterOptions.type, body.type), eq(masterOptions.updatedAt, before.updatedAt))).returning();
      if (!option) return Response.json({ error: "別の端末で先に更新されています。画面を再読み込みしてください", conflict: true }, { status: 409 });
      await appendAudit({ action: "update", targetType: `master:${body.type}`, targetId: option.id, targetName: option.name, before, after: option });
      return Response.json({ option });
    }
    if (body.action === "archive" || body.action === "restore") {
      const [before] = await db.select().from(masterOptions).where(and(eq(masterOptions.id, body.id), eq(masterOptions.type, body.type))).limit(1);
      if (!before) throw new Error("対象が見つかりません");
      if ((body.expectedUpdatedAt ?? "") !== before.updatedAt) {
        return Response.json({ error: "別の端末で先に更新されています。画面を再読み込みしてください", conflict: true, option: before }, { status: 409 });
      }
      const [option] = await db.update(masterOptions).set({ archivedAt: body.action === "archive" ? now : "", updatedAt: now }).where(and(eq(masterOptions.id, body.id), eq(masterOptions.type, body.type), eq(masterOptions.updatedAt, before.updatedAt))).returning();
      if (!option) return Response.json({ error: "別の端末で先に更新されています。画面を再読み込みしてください", conflict: true }, { status: 409 });
      await appendAudit({ action: body.action, targetType: `master:${body.type}`, targetId: option.id, targetName: option.name, before, after: option });
      return Response.json({ option });
    }
    throw new Error("操作内容が正しくありません");
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存できませんでした";
    return Response.json({ error: message.includes("UNIQUE") ? "同じ名前がすでにあります" : message }, { status: 400 });
  }
}

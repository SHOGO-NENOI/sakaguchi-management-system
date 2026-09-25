import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { siteMasters } from "../../../db/schema";
import { appendAudit } from "../../lib/audit";

type SitePayload = { action?: "upsert"; id?: number; site?: string; location?: string; address?: string; coordinates?: string; expectedUpdatedAt?: string };

function clean(payload: SitePayload) {
  const site = payload.site?.trim() ?? "";
  if (!site) throw new Error("現場名を入力してください");
  return { site, location: payload.location?.trim() ?? "", address: payload.address?.trim() ?? "", coordinates: payload.coordinates?.trim() ?? "" };
}

const normalized = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase();

export async function GET() {
  const db = await getDb();
  return Response.json({ sites: await db.select().from(siteMasters).orderBy(asc(siteMasters.site), asc(siteMasters.id)) });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as SitePayload;
    const values = clean(payload);
    const db = await getDb();
    const existing = await db.select().from(siteMasters);
    if (payload.action === "upsert") {
      const matched = existing.find((row) => normalized(row.site) === normalized(values.site));
      const now = new Date().toISOString();
      if (matched) {
        const merged = {
          site: values.site,
          location: values.location || matched.location,
          address: values.address || matched.address,
          coordinates: values.coordinates || matched.coordinates,
        };
        if (
          !matched.archivedAt &&
          matched.site === merged.site &&
          matched.location === merged.location &&
          matched.address === merged.address &&
          matched.coordinates === merged.coordinates
        ) return Response.json({ site: matched, created: false });
        const [site] = await db.update(siteMasters).set({
          ...merged,
          archivedAt: "",
          updatedAt: now,
        }).where(eq(siteMasters.id, matched.id)).returning();
        await appendAudit({ action: "update", targetType: "site", targetId: site.id, targetName: site.site, before: matched, after: site });
        return Response.json({ site, created: false });
      }
      const [site] = await db.insert(siteMasters).values({ ...values, createdAt: now, updatedAt: now }).returning();
      await appendAudit({ action: "create", targetType: "site", targetId: site.id, targetName: site.site, after: site });
      return Response.json({ site, created: true }, { status: 201 });
    }
    if (existing.some((row) => normalized(row.site) === normalized(values.site) && normalized(row.location) === normalized(values.location) && normalized(row.address) === normalized(values.address))) throw new Error("同じ現場がすでに登録されています");
    const now = new Date().toISOString();
    const [site] = await db.insert(siteMasters).values({ ...values, createdAt: now, updatedAt: now }).returning();
    await appendAudit({ action: "create", targetType: "site", targetId: site.id, targetName: site.site, after: site });
    return Response.json({ site }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "現場を追加できませんでした" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as SitePayload;
    if (!payload.id) throw new Error("編集する現場が見つかりません");
    const db = await getDb();
    const [before] = await db.select().from(siteMasters).where(eq(siteMasters.id, payload.id)).limit(1);
    if (!before) throw new Error("編集する現場が見つかりません");
    if ((payload.expectedUpdatedAt ?? "") !== before.updatedAt) return Response.json({ error: "別の端末で先に更新されています。画面を再読み込みしてください", conflict: true, site: before }, { status: 409 });
    const [site] = await db.update(siteMasters).set({ ...clean(payload), updatedAt: new Date().toISOString() }).where(and(eq(siteMasters.id, payload.id), eq(siteMasters.updatedAt, before.updatedAt))).returning();
    if (!site) return Response.json({ error: "別の端末で先に更新されています。画面を再読み込みしてください", conflict: true }, { status: 409 });
    await appendAudit({ action: "update", targetType: "site", targetId: site.id, targetName: site.site, before, after: site });
    return Response.json({ site });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "現場を編集できませんでした" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as { id?: number; action?: "archive" | "restore" };
    if (!payload.id || !["archive", "restore"].includes(payload.action ?? "")) throw new Error("対象の現場が見つかりません");
    const db = await getDb();
    const [before] = await db.select().from(siteMasters).where(eq(siteMasters.id, payload.id)).limit(1);
    const [site] = await db.update(siteMasters).set({ archivedAt: payload.action === "archive" ? new Date().toISOString() : "", updatedAt: new Date().toISOString() }).where(eq(siteMasters.id, payload.id)).returning();
    if (!site) throw new Error("対象の現場が見つかりません");
    await appendAudit({ action: payload.action === "archive" ? "archive" : "restore", targetType: "site", targetId: site.id, targetName: site.site, before, after: site });
    return Response.json({ site });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "現場を更新できませんでした" }, { status: 400 }); }
}

import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { toolChecks, toolItems, toolSets } from "../../../db/schema";

type ToolCategory = "通常業務" | "出張";

const PERSISTENT_CHECK_DATE = "0001-01-01";

const defaultSets: { category: ToolCategory; name: string; items: string[] }[] = [
  { category: "通常業務", name: "共通基本セット", items: ["ヘルメット", "安全靴", "作業手袋", "保護メガネ", "救急セット", "飲料"] },
  { category: "通常業務", name: "剪定セット", items: ["剪定ばさみ", "刈込ばさみ", "のこぎり", "脚立", "ブロワー"] },
  { category: "通常業務", name: "草刈りセット", items: ["草刈機", "混合燃料", "替刃", "防護面", "飛散防止ネット"] },
  { category: "通常業務", name: "伐根セット", items: ["スコップ", "ツルハシ", "バール", "チェーンソー", "ロープ"] },
  { category: "通常業務", name: "清掃セット", items: ["ほうき", "熊手", "ちりとり", "ごみ袋", "ブロワー"] },
  { category: "出張", name: "出張基本セット", items: ["作業着", "着替え", "洗面用具", "充電器", "常備薬"] },
  { category: "出張", name: "車両・書類セット", items: ["運転免許証", "ETCカード", "給油カード", "宿泊先情報"] },
];

async function seedDefaults() {
  const db = await getDb();
  const existing = await db.select({ id: toolSets.id }).from(toolSets).limit(1);
  if (existing.length) return;
  for (let setIndex = 0; setIndex < defaultSets.length; setIndex += 1) {
    const definition = defaultSets[setIndex];
    const [set] = await db.insert(toolSets).values({ category: definition.category, name: definition.name, sortOrder: setIndex }).returning();
    if (definition.items.length) await db.insert(toolItems).values(definition.items.map((name, itemIndex) => ({ setId: set.id, name, sortOrder: itemIndex })));
  }
}

export async function GET() {
  try {
    await seedDefaults();
    const db = await getDb();
    const [sets, items, checks] = await Promise.all([
      db.select().from(toolSets).where(eq(toolSets.archivedAt, "")).orderBy(asc(toolSets.sortOrder), asc(toolSets.id)),
      db.select().from(toolItems).where(eq(toolItems.archivedAt, "")).orderBy(asc(toolItems.sortOrder), asc(toolItems.id)),
      db.select().from(toolChecks).orderBy(desc(toolChecks.checkDate), desc(toolChecks.id)),
    ]);
    const persistentChecks = new Map(
      checks
        .filter((check) => check.checkDate === PERSISTENT_CHECK_DATE)
        .map((check) => [check.itemId, check.checked]),
    );
    const latestLegacyChecks = new Map<number, boolean>();
    checks.forEach((check) => {
      if (
        check.checkDate !== PERSISTENT_CHECK_DATE &&
        !latestLegacyChecks.has(check.itemId)
      )
        latestLegacyChecks.set(check.itemId, check.checked);
    });
    const checkedIds = new Set(
      items
        .filter((item) =>
          persistentChecks.has(item.id)
            ? persistentChecks.get(item.id)
            : latestLegacyChecks.get(item.id),
        )
        .map((item) => item.id),
    );
    return Response.json({ sets: sets.map((set) => ({ ...set, items: items.filter((item) => item.setId === set.id).map((item) => ({ ...item, checked: checkedIds.has(item.id) })) })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "道具一覧を読み込めませんでした" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; category?: ToolCategory; name?: string; setId?: number; itemId?: number; checked?: boolean; itemIds?: number[]; reorderType?: "set" | "item"; orderedIds?: number[] };
    const db = await getDb();
    if (body.action === "add_set") {
      if (!body.name?.trim() || !["通常業務", "出張"].includes(body.category ?? "")) throw new Error("セット名を入力してください");
      const [lastSet] = await db.select({ id: toolSets.id }).from(toolSets).orderBy(desc(toolSets.id)).limit(1);
      const [lastInCategory] = await db.select({ sortOrder: toolSets.sortOrder }).from(toolSets).where(eq(toolSets.category, body.category!)).orderBy(desc(toolSets.sortOrder)).limit(1);
      const [set] = await db.insert(toolSets).values({
        id: (lastSet?.id ?? 0) + 1,
        category: body.category!,
        name: body.name.trim(),
        sortOrder: (lastInCategory?.sortOrder ?? -1) + 1,
      }).returning();
      return Response.json({ set: { ...set, items: [] } }, { status: 201 });
    }
    if (body.action === "add_item") {
      if (!body.setId || !body.name?.trim()) throw new Error("道具名を入力してください");
      const [lastItem] = await db.select({ id: toolItems.id }).from(toolItems).orderBy(desc(toolItems.id)).limit(1);
      const [lastInSet] = await db.select({ sortOrder: toolItems.sortOrder }).from(toolItems).where(eq(toolItems.setId, body.setId)).orderBy(desc(toolItems.sortOrder)).limit(1);
      const [item] = await db.insert(toolItems).values({
        id: (lastItem?.id ?? 0) + 1,
        setId: body.setId,
        name: body.name.trim(),
        sortOrder: (lastInSet?.sortOrder ?? -1) + 1,
      }).returning();
      return Response.json({ item: { ...item, checked: false } }, { status: 201 });
    }
    if (body.action === "toggle") {
      if (!body.itemId) throw new Error("チェック対象が見つかりません");
      await db.insert(toolChecks).values({ checkDate: PERSISTENT_CHECK_DATE, itemId: body.itemId, checked: Boolean(body.checked) }).onConflictDoUpdate({ target: [toolChecks.checkDate, toolChecks.itemId], set: { checked: Boolean(body.checked) } });
      return Response.json({ ok: true });
    }
    if (body.action === "reset") {
      const itemIds = [...new Set((body.itemIds ?? []).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 500);
      if (itemIds.length)
        await db.insert(toolChecks).values(itemIds.map((itemId) => ({ checkDate: PERSISTENT_CHECK_DATE, itemId, checked: false }))).onConflictDoUpdate({ target: [toolChecks.checkDate, toolChecks.itemId], set: { checked: false } });
      return Response.json({ ok: true });
    }
    if (body.action === "reorder") {
      const orderedIds = [...new Set((body.orderedIds ?? []).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 200);
      if (!orderedIds.length) throw new Error("並び替える項目が見つかりません");
      if (body.reorderType === "set") {
        if (!["通常業務", "出張"].includes(body.category ?? "")) throw new Error("業務区分が正しくありません");
        const current = await db.select({ id: toolSets.id }).from(toolSets).where(eq(toolSets.category, body.category!));
        const currentIds = new Set(current.map((set) => set.id));
        if (currentIds.size !== orderedIds.length || orderedIds.some((id) => !currentIds.has(id))) throw new Error("セットの一覧を更新してから並び替えてください");
        for (let index = 0; index < orderedIds.length; index += 1) await db.update(toolSets).set({ sortOrder: index }).where(eq(toolSets.id, orderedIds[index]));
      } else if (body.reorderType === "item") {
        if (!body.setId) throw new Error("セットが見つかりません");
        const current = await db.select({ id: toolItems.id }).from(toolItems).where(eq(toolItems.setId, body.setId));
        const currentIds = new Set(current.map((item) => item.id));
        if (currentIds.size !== orderedIds.length || orderedIds.some((id) => !currentIds.has(id))) throw new Error("道具の一覧を更新してから並び替えてください");
        for (let index = 0; index < orderedIds.length; index += 1) await db.update(toolItems).set({ sortOrder: index }).where(eq(toolItems.id, orderedIds[index]));
      } else throw new Error("並び替えの種類が正しくありません");
      return Response.json({ ok: true });
    }
    throw new Error("操作内容が正しくありません");
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存できませんでした";
    return Response.json({ error: message.includes("UNIQUE") ? "同じ名前がすでにあります" : message.startsWith("Failed query") ? "保存処理に失敗しました。もう一度お試しください" : message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as { type?: "set" | "item"; id?: number };
    if (!body.id) throw new Error("削除対象が見つかりません");
    const db = await getDb();
    if (body.type === "item") {
      await db.update(toolItems).set({ archivedAt: new Date().toISOString() }).where(eq(toolItems.id, body.id));
    } else if (body.type === "set") {
      await db.update(toolSets).set({ archivedAt: new Date().toISOString() }).where(eq(toolSets.id, body.id));
    } else throw new Error("削除対象が正しくありません");
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "削除できませんでした" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { type?: "set" | "item"; id?: number; name?: string };
    const name = body.name?.trim();
    if (!body.id || !name) throw new Error("新しい名前を入力してください");
    const db = await getDb();
    if (body.type === "set") await db.update(toolSets).set({ name }).where(eq(toolSets.id, body.id));
    else if (body.type === "item") await db.update(toolItems).set({ name }).where(eq(toolItems.id, body.id));
    else throw new Error("編集対象が正しくありません");
    return Response.json({ ok: true, name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "編集できませんでした";
    return Response.json({ error: message.includes("UNIQUE") ? "同じ名前がすでにあります" : message }, { status: 400 });
  }
}

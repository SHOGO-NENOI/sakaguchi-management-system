import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { siteDocuments } from "../../../db/schema";
import { ensureDriveFolder, googleFetch } from "../../lib/google-api";
import { appendAudit } from "../../lib/audit";
import { ensureOperationalSchema } from "../../lib/operational-schema";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function validSiteKey(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 500 ? value.trim() : null;
}

export async function GET(request: Request) {
  try {
    await ensureOperationalSchema();
    const params = new URL(request.url).searchParams;
    const db = await getDb();
    if (params.get("counts") === "1") {
      const rows = await db
        .select({ siteKey: siteDocuments.siteKey, count: count() })
        .from(siteDocuments)
        .where(eq(siteDocuments.archivedAt, ""))
        .groupBy(siteDocuments.siteKey);
      return Response.json({
        counts: Object.fromEntries(rows.map((row) => [row.siteKey, row.count])),
      });
    }
    const siteKey = validSiteKey(params.get("siteKey"));
    if (!siteKey) return Response.json({ error: "現場が見つかりません" }, { status: 400 });
    const documents = await db.select({ id: siteDocuments.id, siteKey: siteDocuments.siteKey, fileName: siteDocuments.fileName, contentType: siteDocuments.contentType, size: siteDocuments.size, uploadedAt: siteDocuments.uploadedAt }).from(siteDocuments).where(and(eq(siteDocuments.siteKey, siteKey), eq(siteDocuments.archivedAt, ""))).orderBy(asc(siteDocuments.uploadedAt), asc(siteDocuments.id));
    return Response.json({ documents });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "資料を読み込めませんでした" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureOperationalSchema();
    const url = new URL(request.url);
    const siteKey = validSiteKey(url.searchParams.get("siteKey"));
    const fileName = (url.searchParams.get("fileName") || "名称未設定").trim().slice(0, 255);
    let contentType = (request.headers.get("content-type") || "application/octet-stream").split(";", 1)[0].trim().toLowerCase();
    if (contentType === "application/octet-stream") {
      const extension = fileName.split(".").pop()?.toLowerCase();
      contentType = extension === "pdf" ? "application/pdf"
        : extension === "png" ? "image/png"
        : extension === "webp" ? "image/webp"
        : extension === "heic" ? "image/heic"
        : extension === "heif" ? "image/heif"
        : extension === "gif" ? "image/gif"
        : ["jpg", "jpeg"].includes(extension ?? "") ? "image/jpeg"
        : contentType;
    }
    if (!siteKey) throw new Error("現場が見つかりません");
    if (!(contentType === "application/pdf" || contentType.startsWith("image/"))) throw new Error(`「${fileName}」は画像またはPDFではありません`);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength) throw new Error("画像またはPDFを選択してください");
    if (bytes.byteLength > MAX_FILE_SIZE) throw new Error(`「${fileName}」は25MBを超えています`);
    const db = await getDb();
    const folderId = await ensureDriveFolder();
    const boundary = `saka-${crypto.randomUUID()}`;
    const metadata = JSON.stringify({ name: fileName, parents: [folderId], appProperties: { siteKey } });
    const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`, bytes, `\r\n--${boundary}--`]);
    const upload = await googleFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body });
    const uploaded = await upload.json() as { id: string };
    try {
      const [document] = await db.insert(siteDocuments).values({ siteKey, fileName, objectKey: `google:${uploaded.id}`, contentType, size: bytes.byteLength, uploadedAt: new Date().toISOString() }).returning();
      await appendAudit({ action: "create", targetType: "document", targetId: document.id, targetName: document.fileName, after: document });
      return Response.json({ document: { id: document.id, siteKey: document.siteKey, fileName: document.fileName, contentType: document.contentType, size: document.size, uploadedAt: document.uploadedAt } }, { status: 201 });
    } catch (error) {
      await googleFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(uploaded.id)}`, { method: "DELETE" });
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "資料を保存できませんでした";
    return Response.json({ error: message === "The string did not match the expected pattern." ? "ファイル名を処理できませんでした" : message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { oldSiteKey?: string; newSiteKey?: string };
    const oldSiteKey = validSiteKey(body.oldSiteKey);
    const newSiteKey = validSiteKey(body.newSiteKey);
    if (!oldSiteKey || !newSiteKey) throw new Error("現場情報が正しくありません");
    if (oldSiteKey !== newSiteKey) {
      const db = await getDb();
      await db.update(siteDocuments).set({ siteKey: newSiteKey }).where(eq(siteDocuments.siteKey, oldSiteKey));
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "資料の関連付けを更新できませんでした" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureOperationalSchema();
    const body = await request.json() as { id?: number };
    if (!body.id || !Number.isInteger(body.id)) throw new Error("削除する資料が見つかりません");
    const db = await getDb();
    const [document] = await db.select().from(siteDocuments).where(eq(siteDocuments.id, body.id)).limit(1);
    if (!document) throw new Error("資料が見つかりません");
    await db.update(siteDocuments).set({ archivedAt: new Date().toISOString() }).where(eq(siteDocuments.id, document.id));
    await appendAudit({ action: "archive", targetType: "document", targetId: document.id, targetName: document.fileName, before: document });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "資料を削除できませんでした" }, { status: 400 });
  }
}

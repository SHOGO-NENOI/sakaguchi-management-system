import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { siteDocuments } from "../../../../db/schema";
import { googleFetch } from "../../../lib/google-api";
import { requireAuthorizedApiUser } from "../../../authorized-user";

export async function GET(request: Request) {
  const authError = await requireAuthorizedApiUser(); if (authError) return authError;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return new Response("資料が見つかりません", { status: 400 });
    const db = await getDb();
    const [document] = await db.select().from(siteDocuments).where(eq(siteDocuments.id, id)).limit(1);
    if (!document) return new Response("資料が見つかりません", { status: 404 });
    const encodedName = encodeURIComponent(document.fileName).replace(/'/g, "%27");
    if (document.objectKey.startsWith("google:")) {
      const response = await googleFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(document.objectKey.slice(7))}?alt=media`);
      if (!response.ok || !response.body) return new Response("ファイルが見つかりません", { status: 404 });
      return new Response(response.body, { headers: { "Content-Type": document.contentType, "Content-Length": String(document.size), "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
    }
    const { env } = await import("cloudflare:workers");
    if (!env.BUCKET) return new Response("ファイル保存領域を利用できません", { status: 503 });
    const object = await env.BUCKET.get(document.objectKey);
    if (!object) return new Response("ファイルが見つかりません", { status: 404 });
    return new Response(object.body, { headers: { "Content-Type": document.contentType, "Content-Length": String(document.size), "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("資料を開けませんでした", { status: 500 });
  }
}

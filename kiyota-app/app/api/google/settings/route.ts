import { getDb } from "../../../../db";
import { googleOAuthSettings } from "../../../../db/schema";
import { encryptSecret, getGoogleOAuthSettings } from "../../../lib/google-oauth";
import { requireAuthorizedApiUser } from "../../../authorized-user";

function publicSettings(row: Awaited<ReturnType<typeof getGoogleOAuthSettings>>) {
  return {
    configured: Boolean(row?.clientId && row?.clientSecretEncrypted),
    connected: Boolean(row?.refreshTokenEncrypted || row?.accessTokenEncrypted),
    email: row?.connectedEmail ?? "",
    name: row?.connectedName ?? "",
    clientId: row?.clientId ?? "",
    spreadsheetUrl: row?.spreadsheetUrl ?? "",
  };
}

export async function GET() {
  const authError = await requireAuthorizedApiUser(); if (authError) return authError;
  return Response.json({ settings: publicSettings(await getGoogleOAuthSettings()) });
}

export async function PUT(request: Request) {
  const authError = await requireAuthorizedApiUser(); if (authError) return authError;
  try {
    const payload = await request.json() as { clientId?: string; clientSecret?: string };
    const clientId = payload.clientId?.trim() ?? "";
    const clientSecret = payload.clientSecret?.trim() ?? "";
    if (!clientId.endsWith(".apps.googleusercontent.com")) throw new Error("GoogleのクライアントIDを正しく入力してください");
    const existing = await getGoogleOAuthSettings();
    if (!clientSecret && !existing?.clientSecretEncrypted) throw new Error("クライアントシークレットを入力してください");
    const db = await getDb();
    const secret = clientSecret ? await encryptSecret(clientSecret) : existing?.clientSecretEncrypted ?? "";
    const [row] = await db.insert(googleOAuthSettings).values({ id: 1, clientId, clientSecretEncrypted: secret })
      .onConflictDoUpdate({ target: googleOAuthSettings.id, set: { clientId, clientSecretEncrypted: secret } }).returning();
    return Response.json({ settings: publicSettings(row) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Google連携設定を保存できませんでした" }, { status: 400 });
  }
}

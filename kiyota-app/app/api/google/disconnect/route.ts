import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { googleOAuthSettings } from "../../../../db/schema";
import { decryptSecret, getGoogleOAuthSettings } from "../../../lib/google-oauth";
import { KIYOTA_SESSION_COOKIE, requireAuthorizedApiUser } from "../../../authorized-user";
import { oauthCookie } from "../../../lib/google-oauth";

export async function POST() {
  const authError = await requireAuthorizedApiUser(); if (authError) return authError;
  try {
    const settings = await getGoogleOAuthSettings();
    const encryptedToken = settings?.refreshTokenEncrypted || settings?.accessTokenEncrypted;
    if (encryptedToken) {
      const token = await decryptSecret(encryptedToken);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }).catch(() => undefined);
    }
    const db = await getDb();
    await db.update(googleOAuthSettings).set({ accessTokenEncrypted: "", refreshTokenEncrypted: "", accessTokenExpiresAt: 0, connectedEmail: "", connectedName: "", connectedAt: "" }).where(eq(googleOAuthSettings.id, 1));
    return Response.json({ ok: true }, { headers: { "Set-Cookie": oauthCookie(KIYOTA_SESSION_COOKIE, "", 0) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Google連携を解除できませんでした" }, { status: 400 });
  }
}

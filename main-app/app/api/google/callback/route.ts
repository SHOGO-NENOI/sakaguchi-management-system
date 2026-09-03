import { getDb } from "../../../../db";
import { googleOAuthSettings } from "../../../../db/schema";
import { cookieValue, decryptSecret, encryptSecret, getGoogleOAuthSettings, oauthCookie, oauthRedirectUri } from "../../../lib/google-oauth";

export async function GET(request: Request) {
  const destination = new URL("/?google=connected", request.url);
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") ?? "";
    const state = url.searchParams.get("state") ?? "";
    if (!code || !state || state !== cookieValue(request, "google_oauth_state")) throw new Error("Google連携の確認情報が一致しません");
    const settings = await getGoogleOAuthSettings();
    if (!settings?.clientId || !settings.clientSecretEncrypted) throw new Error("Google連携設定がありません");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: settings.clientId, client_secret: await decryptSecret(settings.clientSecretEncrypted), redirect_uri: oauthRedirectUri(request), grant_type: "authorization_code" }),
    });
    const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string };
    if (!tokenResponse.ok || !token.access_token) throw new Error(token.error_description || "Googleから認証情報を取得できませんでした");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json() as { email?: string; name?: string };
    if (!profileResponse.ok || !profile.email) throw new Error("Googleアカウント情報を確認できませんでした");
    const db = await getDb();
    await db.update(googleOAuthSettings).set({
      accessTokenEncrypted: await encryptSecret(token.access_token),
      refreshTokenEncrypted: token.refresh_token ? await encryptSecret(token.refresh_token) : settings.refreshTokenEncrypted,
      accessTokenExpiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      connectedEmail: profile.email,
      connectedName: profile.name ?? "",
      connectedAt: new Date().toISOString(),
    }).where((await import("drizzle-orm")).eq(googleOAuthSettings.id, 1));
  } catch (error) {
    destination.searchParams.set("google", "error");
    destination.searchParams.set("message", error instanceof Error ? error.message : "Google連携に失敗しました");
  }
  const headers = new Headers({ Location: destination.toString() });
  headers.append("Set-Cookie", oauthCookie("google_oauth_state", "", 0));
  return new Response(null, { status: 302, headers });
}

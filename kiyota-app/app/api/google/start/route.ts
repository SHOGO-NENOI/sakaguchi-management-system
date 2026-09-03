import { decryptSecret, getGoogleOAuthSettings, oauthCookie, oauthRedirectUri } from "../../../lib/google-oauth";

export async function GET(request: Request) {
  try {
    const settings = await getGoogleOAuthSettings();
    if (!settings?.clientId || !settings.clientSecretEncrypted) throw new Error("先にクライアントIDとシークレットを保存してください");
    await decryptSecret(settings.clientSecretEncrypted);
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: settings.clientId,
      redirect_uri: oauthRedirectUri(request),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
      scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"].join(" "),
    });
    const headers = new Headers({ Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    headers.append("Set-Cookie", oauthCookie("google_oauth_state", state, 600));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    return Response.redirect(new URL(`/?google=error&message=${encodeURIComponent(error instanceof Error ? error.message : "連携を開始できませんでした")}`, request.url));
  }
}

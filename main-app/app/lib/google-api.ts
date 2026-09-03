import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { googleOAuthSettings } from "../../db/schema";
import { decryptSecret, encryptSecret, getGoogleOAuthSettings } from "./google-oauth";

export async function googleAccessToken() {
  const settings = await getGoogleOAuthSettings();
  if (!settings?.refreshTokenEncrypted && !settings?.accessTokenEncrypted) throw new Error("設定からGoogleアカウントを連携してください");
  if (settings.accessTokenEncrypted && settings.accessTokenExpiresAt > Date.now() + 60_000) return decryptSecret(settings.accessTokenEncrypted);
  if (!settings.refreshTokenEncrypted) throw new Error("Googleアカウントをもう一度連携してください");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: settings.clientId, client_secret: await decryptSecret(settings.clientSecretEncrypted), refresh_token: await decryptSecret(settings.refreshTokenEncrypted), grant_type: "refresh_token" }),
  });
  const result = await response.json() as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !result.access_token) throw new Error(result.error_description || "Googleアカウントを再連携してください");
  const db = await getDb();
  await db.update(googleOAuthSettings).set({ accessTokenEncrypted: await encryptSecret(result.access_token), accessTokenExpiresAt: Date.now() + (result.expires_in ?? 3600) * 1000 }).where(eq(googleOAuthSettings.id, 1));
  return result.access_token;
}

export async function googleFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await googleAccessToken()}`);
  const response = await fetch(url, { ...init, headers });
  if (!response.ok && response.status !== 404) {
    const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message || `Googleサービスへの接続に失敗しました（${response.status}）`);
  }
  return response;
}

export async function ensureSpreadsheet() {
  let settings = await getGoogleOAuthSettings();
  if (!settings) throw new Error("Google連携設定がありません");
  if (settings.spreadsheetId) return { id: settings.spreadsheetId, url: settings.spreadsheetUrl };
  const response = await googleFetch("https://sheets.googleapis.com/v4/spreadsheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ properties: { title: "坂口商会勤怠記録データ" }, sheets: [{ properties: { title: "勤務記録" } }] }) });
  const result = await response.json() as { spreadsheetId: string; spreadsheetUrl: string };
  const db = await getDb();
  await db.update(googleOAuthSettings).set({ spreadsheetId: result.spreadsheetId, spreadsheetUrl: result.spreadsheetUrl }).where(eq(googleOAuthSettings.id, 1));
  const headers = [["記録ID", "日付", "記録状態", "勤務区分", "開始", "終了", "場所", "現場名", "住所", "緯度経度", "作業者", "作業内容", "メモ", "出張", "夜ご飯", "宿泊ホテル", "更新日時"]];
  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${result.spreadsheetId}/values/${encodeURIComponent("勤務記録!A1:Q1")}?valueInputOption=RAW`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: headers }) });
  return { id: result.spreadsheetId, url: result.spreadsheetUrl };
}

export async function ensureDriveFolder() {
  const settings = await getGoogleOAuthSettings();
  if (!settings) throw new Error("Google連携設定がありません");
  if (settings.driveFolderId) return settings.driveFolderId;
  const response = await googleFetch("https://www.googleapis.com/drive/v3/files?fields=id", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "坂口商会 現場資料", mimeType: "application/vnd.google-apps.folder" }) });
  const result = await response.json() as { id: string };
  const db = await getDb();
  await db.update(googleOAuthSettings).set({ driveFolderId: result.id }).where(eq(googleOAuthSettings.id, 1));
  return result.id;
}

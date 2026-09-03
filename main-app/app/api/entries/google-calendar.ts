import { attendanceEntries } from "../../../db/schema";
import { ensureSpreadsheet, googleFetch } from "../../lib/google-api";
import { getGoogleOAuthSettings } from "../../lib/google-oauth";

type EntryRow = typeof attendanceEntries.$inferSelect;
const normalizedWorkType = (value: string) => ["有給", "公休", "雨天中止", "欠勤"].includes(value) ? "休み" : value;
function split(value: string) { return value.split("｜"); }
function siteRows(row: EntryRow) {
  const values = [row.site, row.location, row.work, row.address, row.coordinates, row.personnelNames, row.startTime, row.endTime, row.note].map(split);
  const count = Math.max(...values.map((items) => items.length), 1);
  return Array.from({ length: count }, (_, index) => ({ site: values[0][index]?.trim() ?? "", location: values[1][index]?.trim() ?? "", work: values[2][index]?.trim() ?? "", address: values[3][index]?.trim() ?? "", coordinates: values[4][index]?.trim() ?? "", personnelNames: values[5][index]?.trim() ?? "", start: values[6][index]?.trim() || values[6][0]?.trim() || "08:00", end: values[7][index]?.trim() || values[7][0]?.trim() || "17:00", note: values[8][index]?.trim() ?? "" }));
}
function addDay(value: string) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }
function isSunday(value: string) { return new Date(`${value}T00:00:00Z`).getUTCDay() === 0; }
function todayInJapan() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export async function syncSheet(row: EntryRow, action: "upsert" | "delete") {
  const spreadsheet = await ensureSpreadsheet();
  const idsResponse = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.id}/values/${encodeURIComponent("勤務記録!A:A")}`);
  const ids = (await idsResponse.json() as { values?: string[][] }).values ?? [];
  const rowNumber = ids.findIndex((item) => item[0] === String(row.id)) + 1;
  if (action === "delete") {
    if (rowNumber > 0) {
      const metaResponse = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.id}?fields=sheets.properties`);
      const meta = await metaResponse.json() as { sheets: { properties: { sheetId: number; title: string } }[] };
      const sheetId = meta.sheets.find((sheet) => sheet.properties.title === "勤務記録")?.properties.sheetId ?? 0;
      await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.id}:batchUpdate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber } } }] }) });
    }
    return spreadsheet.url;
  }
  const status = row.workDate > todayInJapan() ? "予定" : "実績";
  const values = [[String(row.id), row.workDate, status, normalizedWorkType(row.workType), row.startTime, row.endTime, row.location, row.site, row.address, row.coordinates, row.personnelNames, row.work, row.note, row.businessTrip ? "出張" : "", row.dinnerType, row.hotelName, new Date().toISOString()]];
  if (rowNumber > 0) {
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.id}/values/${encodeURIComponent(`勤務記録!A${rowNumber}:Q${rowNumber}`)}?valueInputOption=USER_ENTERED`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
  } else {
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.id}/values/${encodeURIComponent("勤務記録!A:Q")}:append?valueInputOption=USER_ENTERED`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
  }
  return spreadsheet.url;
}

export async function syncGoogleCalendar(row: EntryRow, action: "upsert" | "delete", options: { calendarEndDate?: string; suppressCalendar?: boolean } = {}) {
  const settings = await getGoogleOAuthSettings();
  if (!settings?.accessTokenEncrypted && !settings?.refreshTokenEncrypted) return { eventId: row.googleEventId, synced: false };
  const workType = normalizedWorkType(row.workType);
  const isOff = workType === "休み";
  const effectiveAction = action === "upsert" && (options.suppressCalendar || (isOff && isSunday(row.workDate))) ? "delete" : action;
  const oldIds = row.googleEventId ? row.googleEventId.split("｜").filter(Boolean) : [];
  const sites = siteRows(row);
  const targets = effectiveAction === "delete" ? Array.from({ length: Math.max(oldIds.length, 1) }, (_, index) => ({ id: oldIds[index] ?? "", site: sites[index] ?? sites[0] })) : sites.map((site, index) => ({ id: oldIds[index] ?? "", site }));
  const nextIds: string[] = [];
  const status = row.workDate > todayInJapan() ? "予定" : "実績";
  for (const [targetIndex, target] of targets.entries()) {
    if (effectiveAction === "delete") {
      if (target.id) await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(target.id)}`, { method: "DELETE" });
      continue;
    }
    const place = [target.site.location, target.site.site].filter(Boolean).join("@") || "現場未入力";
    const identity = { private: { sakaguchiEntryId: String(row.id), sakaguchiSiteIndex: String(targetIndex), sakaguchiSource: "attendance-app" } };
    const event = isOff ? { summary: row.note.trim() || "休み", colorId: "2", start: { date: row.workDate }, end: { date: addDay(options.calendarEndDate || row.workDate) }, extendedProperties: identity } : {
      summary: `${status === "予定" ? "【予定】" : ""}${place}【${target.site.work || workType}】`, location: target.site.address || target.site.coordinates || target.site.location,
      description: [`記録状態：${status}`, `勤務区分：${workType}`, `現場：${place}`, target.site.work && `作業内容：${target.site.work}`, target.site.address && `住所：${target.site.address}`, target.site.coordinates && `緯度・経度：${target.site.coordinates}`, target.site.personnelNames && `作業者：${target.site.personnelNames}`, row.businessTrip && `出張・夜ご飯：${row.dinnerType || "未選択"}`, row.businessTrip && row.hotelName && `宿泊ホテル：${row.hotelName}`, target.site.note && `メモ：${target.site.note}`].filter(Boolean).join("\n"), colorId: row.businessTrip ? "5" : "7",
      start: { dateTime: `${row.workDate}T${target.site.start}:00+09:00`, timeZone: "Asia/Tokyo" }, end: { dateTime: `${row.workDate}T${target.site.end}:00+09:00`, timeZone: "Asia/Tokyo" }, extendedProperties: identity,
    };
    const endpoint = target.id ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(target.id)}` : "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    let response = await googleFetch(endpoint, { method: target.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) });
    if (response.status === 404) response = await googleFetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) });
    const result = await response.json() as { id?: string };
    if (result.id) nextIds.push(result.id);
  }
  for (const staleId of oldIds.slice(targets.length)) await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(staleId)}`, { method: "DELETE" });
  const spreadsheetUrl = await syncSheet(row, action);
  return { eventId: effectiveAction === "upsert" ? nextIds.join("｜") : "", spreadsheetUrl, synced: true };
}

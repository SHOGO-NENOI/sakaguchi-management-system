import { ensureDriveFolder, googleFetch } from "./google-api";
import { ensureOperationalSchema } from "./operational-schema";

function japanDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function backupFolderId() {
  const parent = await ensureDriveFolder();
  const query = new URLSearchParams({
    q: `'${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false and appProperties has { key='sakaguchiAttendance' and value='backups' }`,
    fields: "files(id)",
    pageSize: "1",
  });
  const existing = await googleFetch(`https://www.googleapis.com/drive/v3/files?${query}`);
  const data = await existing.json() as { files?: { id: string }[] };
  if (data.files?.[0]) return data.files[0].id;
  const created = await googleFetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "勤怠アプリ 自動バックアップ",
      mimeType: "application/vnd.google-apps.folder",
      parents: [parent],
      appProperties: { sakaguchiAttendance: "backups" },
    }),
  });
  return ((await created.json()) as { id: string }).id;
}

export async function listBackups(limit = 10) {
  const folderId = await backupFolderId();
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,createdTime,size,webViewLink)",
    orderBy: "createdTime desc",
    pageSize: String(limit),
  });
  const response = await googleFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  return ((await response.json()) as { files?: Record<string, string>[] }).files ?? [];
}

export async function createDailyBackup(force = false) {
  await ensureOperationalSchema();
  const dateKey = japanDateKey();
  const folderId = await backupFolderId();
  if (!force) {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false and appProperties has { key='backupDate' and value='${dateKey}' }`,
      fields: "files(id,name,createdTime,size,webViewLink)",
      pageSize: "1",
    });
    const response = await googleFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    const data = await response.json() as { files?: Record<string, string>[] };
    if (data.files?.[0]) return { created: false, file: data.files[0] };
  }
  const { env } = await import("cloudflare:workers");
  const tables = [
    "attendance_entries",
    "site_masters",
    "master_options",
    "tool_sets",
    "tool_items",
    "tool_checks",
    "site_documents",
    "audit_logs",
  ];
  const entries = await Promise.all(tables.map(async (table) => {
    const result = await env.DB.prepare(`SELECT * FROM ${table}`).all();
    return [table, result.results] as const;
  }));
  const snapshot = {
    format: "sakaguchi-attendance-backup-v1",
    createdAt: new Date().toISOString(),
    note: "現場資料の本体は同じGoogle Drive内に保存されています。site_documentsは資料の索引です。",
    tables: Object.fromEntries(entries),
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `勤怠アプリバックアップ_${dateKey}_${stamp}.json`;
  const boundary = `sakaguchi-backup-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
    appProperties: { sakaguchiAttendance: "backup", backupDate: dateKey },
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(snapshot, null, 2),
    `\r\n--${boundary}--`,
  ]);
  const response = await googleFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size,webViewLink",
    { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body },
  );
  return { created: true, file: await response.json() as Record<string, string> };
}

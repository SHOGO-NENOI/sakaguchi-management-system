import { appendAudit } from "@/app/lib/audit";
import { createDailyBackup, listBackups } from "@/app/lib/backup";

export async function GET() {
  try {
    return Response.json({ backups: await listBackups() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "バックアップを確認できませんでした" }, { status: 400 });
  }
}

export async function POST() {
  try {
    const result = await createDailyBackup(true);
    await appendAudit({ action: "backup", targetType: "backup", targetName: String(result.file.name ?? "手動バックアップ") });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "バックアップを作成できませんでした" }, { status: 400 });
  }
}

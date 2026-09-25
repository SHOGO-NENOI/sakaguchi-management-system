import { listAuditLogs } from "@/app/lib/audit";

export async function GET() {
  try {
    return Response.json({ logs: await listAuditLogs() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "操作履歴を読み込めませんでした" }, { status: 500 });
  }
}

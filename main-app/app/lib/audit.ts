import { desc } from "drizzle-orm";
import { getDb } from "../../db";
import { auditLogs } from "../../db/schema";
import { ensureOperationalSchema } from "./operational-schema";

type AuditInput = {
  action: string;
  targetType: string;
  targetId?: number | null;
  targetName?: string;
  before?: unknown;
  after?: unknown;
  actorName?: string;
};

const serialized = (value: unknown) =>
  value === undefined ? "" : JSON.stringify(value).slice(0, 20_000);

export async function appendAudit(input: AuditInput) {
  await ensureOperationalSchema();
  const db = await getDb();
  await db.insert(auditLogs).values({
    actorName: input.actorName?.trim() || "子野井",
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    targetName: input.targetName?.trim() || "",
    beforeJson: serialized(input.before),
    afterJson: serialized(input.after),
    createdAt: new Date().toISOString(),
  });
}

export async function listAuditLogs(limit = 200) {
  await ensureOperationalSchema();
  const db = await getDb();
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(limit);
}

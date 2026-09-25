let schemaReady: Promise<void> | null = null;

async function addColumnIfMissing(
  database: D1Database,
  table: string,
  column: string,
  definition: string,
) {
  const result = await database.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!result.results.some((item) => item.name === column)) {
    try {
      await database.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    } catch (error) {
      const current = await database.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
      if (!current.results.some((item) => item.name === column)) throw error;
    }
  }
}

export function ensureOperationalSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const { env } = await import("cloudflare:workers");
      const database = env.DB;
      if (!database) throw new Error("Cloudflare D1を利用できません");
      await addColumnIfMissing(database, "attendance_entries", "updated_at", "TEXT NOT NULL DEFAULT ''");
      await addColumnIfMissing(database, "site_documents", "archived_at", "TEXT NOT NULL DEFAULT ''");
      await database.prepare(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          actor_name TEXT NOT NULL DEFAULT '子野井',
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id INTEGER,
          target_name TEXT NOT NULL DEFAULT '',
          before_json TEXT NOT NULL DEFAULT '',
          after_json TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        )
      `).run();
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

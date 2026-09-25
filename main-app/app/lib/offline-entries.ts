export type OfflineEntry = {
  id: string;
  body: Record<string, unknown>;
  createdAt: string;
};

const KEY = "sakaguchi-attendance-offline-entries-v1";

export function offlineEntries(): OfflineEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function queueOfflineEntry(body: Record<string, unknown>) {
  const rows = offlineEntries();
  rows.push({ id: crypto.randomUUID(), body, createdAt: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("attendance-offline-queue-changed"));
}

export async function flushOfflineEntries() {
  const rows = offlineEntries();
  if (!navigator.onLine) return { remaining: rows.length, saved: [] as unknown[] };
  const remaining: OfflineEntry[] = [];
  const saved: unknown[] = [];
  for (const row of rows) {
    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row.body),
      });
      if (!response.ok) remaining.push(row);
      else saved.push((await response.json() as { entry: unknown }).entry);
    } catch {
      remaining.push(row);
    }
  }
  localStorage.setItem(KEY, JSON.stringify(remaining));
  window.dispatchEvent(new CustomEvent("attendance-offline-queue-changed"));
  return { remaining: remaining.length, saved };
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("does not offer a hide action on site cards", async () => {
  const source = await readFile(
    new URL("../app/components/SitesTab.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, />\s*非表示\s*</);
  assert.doesNotMatch(source, /archiveSite/);
});

test("renders the Sakaguchi attendance metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>坂口商会勤怠管理アプリ（個人用）<\/title>/i);
  assert.match(html, /<meta property="og:title" content="坂口商会勤怠管理アプリ（個人用）"\/>/i);
  assert.match(html, /<meta property="og:image" content="https:\/\/sakaguchi-management-system\.nenoi-shogo\.workers\.dev\/og\.png"\/>/i);
  assert.match(html, /<link rel="apple-touch-icon" href="https:\/\/sakaguchi-management-system\.nenoi-shogo\.workers\.dev\/sakaguchi-icon\.png"\/>/i);
  assert.match(
    html,
    /aria-label="管理メニュー"[\s\S]*?>設定<\/button>[\s\S]*?>シフトボード<\/button>[\s\S]*?>道具チェック<\/button>/i,
  );
  assert.match(
    html,
    /aria-label="メインメニュー"[\s\S]*?>入力<\/button>[\s\S]*?>予定<\/button>[\s\S]*?>記録<\/button>[\s\S]*?>現場<\/button>[\s\S]*?>集計<\/button>/i,
  );
  assert.doesNotMatch(html, /class="app-more"/i);
  assert.match(html, /音声アシスタント・まとめて音声入力/i);
  assert.match(html, /フォームへ反映/i);
  assert.match(html, /必須[^<]*<\/b>/i);
  assert.match(html, /保存前に必ず入力してください/i);
});

test("includes offline, backup, restore, audit, and concurrency safeguards", async () => {
  const [page, entriesApi, worker, config, schema] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/entries/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /queueOfflineEntry\(payload\)/);
  assert.match(page, /attendanceWarnings\(form, entries, editingId\)/);
  assert.match(entriesApi, /expectedUpdatedAt/);
  assert.match(entriesApi, /status: 409/);
  assert.match(worker, /createDailyBackup\(false\)/);
  assert.match(config, /"0 18 \* \* \*"/);
  assert.match(schema, /export const auditLogs/);
});

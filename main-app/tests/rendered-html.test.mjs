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
  assert.match(html, /iPhoneで直接録音が動かない場合/i);
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

test("includes configurable deductions and take-home estimate", async () => {
  const [page, summary, types] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SummaryTab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/types.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /takeHome:\s*Math\.max\(0, gross - deductionTotal\)/);
  assert.match(summary, /概算手取り/);
  assert.match(summary, /健康保険/);
  assert.match(summary, /厚生年金/);
  assert.match(types, /residentTax: string/);
  assert.match(page, /estimateMonthlyIncomeTax/);
  assert.match(page, /summary\.selfDinner \* 1_500/);
  assert.match(summary, /自費食事分の出張手当/);
  assert.match(summary, /所得税を自動計算する/);
  assert.match(page, /estimateKumamotoResidentTax/);
  assert.match(summary, /熊本市の住民税を自動計算する/);
  assert.match(summary, /前年の給与年収/);
  assert.match(summary, /扶養人数（16歳以上）/);
  assert.match(page, /estimateEmploymentInsurance/);
  assert.match(summary, /雇用保険料を自動計算する/);
  assert.match(summary, /一般の事業（0\.5％）/);
  assert.match(summary, /建設・農林水産・清酒製造（0\.6％）/);
  assert.match(summary, /summary\.overtime \+ weeklyOvertimeMinutes/);
  assert.match(summary, /週40時間超過/);
});

test("separates regular workers and supporters and carries site addresses into plans", async () => {
  const [page, entryTab, sitesTab] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/EntryTab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SitesTab.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /REGULAR_PERSONNEL_NAMES = \["坂口", "清田", "子野井"\]/);
  assert.match(page, /DEFAULT_SUPPORT_PERSONNEL_NAMES = \["下岸"\]/);
  assert.match(page, /addresses\[index\] = matched\.address/);
  assert.match(page, /function createPlanForSite\(card: SiteCardData\)/);
  assert.match(entryTab, />応援者</);
  assert.match(sitesTab, /＋ 予定を追加/);
});

test("keeps schedule site names readable on narrow screens", async () => {
  const [styles, historyPlans] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/HistoryPlansTab.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(
    styles,
    /\.history-item:has\(\.plan-select\) \.record-extra\s*\{\s*grid-column:\s*1;/,
  );
  assert.match(
    styles,
    /\.record-site > p\s*\{[\s\S]*?word-break:\s*keep-all;[\s\S]*?overflow-wrap:\s*break-word;/,
  );
  assert.match(historyPlans, /planEnded[\s\S]*?isPlanEnded\(entry\.date/);
  assert.doesNotMatch(historyPlans, /groupPlanCount\s*>\s*1\s*&&\s*isPlanEnded/);
  assert.match(styles, /\.history-item\.plan-ended\s*\{[\s\S]*?background-color:\s*#dce7e3\s*!important;/);
});

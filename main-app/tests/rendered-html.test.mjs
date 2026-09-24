import assert from "node:assert/strict";
import test from "node:test";

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
});

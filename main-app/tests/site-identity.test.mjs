import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { siteIdentityKey } from "../app/lib/site-identity.ts";

const site = (overrides = {}) => ({
  site: "田中邸",
  location: "熊本",
  address: "",
  coordinates: "",
  ...overrides,
});

test("同じ現場名でも住所が異なれば別現場として扱う", () => {
  assert.notEqual(
    siteIdentityKey(site({ address: "熊本県熊本市中央区新町1丁目" })),
    siteIdentityKey(site({ address: "熊本県熊本市中央区新町2丁目" })),
  );
});

test("同じ現場名と住所は空白表記が違っても同じ現場として扱う", () => {
  assert.equal(
    siteIdentityKey(site({ address: "熊本県 熊本市 中央区新町1丁目" })),
    siteIdentityKey(site({ address: "熊本県熊本市中央区新町1丁目" })),
  );
});

test("住所がない同名現場は緯度経度で区別する", () => {
  assert.notEqual(
    siteIdentityKey(site({ coordinates: "32.800000, 130.700000" })),
    siteIdentityKey(site({ coordinates: "32.900000, 130.800000" })),
  );
});

test("住所と緯度経度がない同名現場は地域名で区別する", () => {
  assert.notEqual(
    siteIdentityKey(site({ location: "熊本" })),
    siteIdentityKey(site({ location: "福岡" })),
  );
});

test("現場マスターの自動登録にも同じ識別ルールを使う", async () => {
  const source = await readFile(
    new URL("../app/api/sites/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /siteIdentityKey\(row\) === siteIdentityKey\(values\)/);
  assert.doesNotMatch(
    source,
    /normalized\(row\.site\) === normalized\(values\.site\)/,
  );
});

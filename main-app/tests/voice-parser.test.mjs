import assert from "node:assert/strict";
import test from "node:test";
import { parseAttendanceVoice } from "../app/lib/attendance-voice.ts";

const baseDate = new Date(2026, 8, 27);
const sites = [{ site: "霧島太陽光発電所", location: "鹿児島市", address: "鹿児島県鹿児島市", coordinates: "" }];
const workers = ["子野井", "清田"];
const works = ["草刈り", "剪定"];

test("登録済み現場を含む一括音声入力を読み取る", () => {
  const result = parseAttendanceVoice(
    "明日、鹿児島市、霧島太陽光発電所、8時から17時、子野井、草刈り、出張",
    sites,
    workers,
    works,
    baseDate,
  );
  assert.equal(result.date, "2026-09-28");
  assert.equal(result.type, "1日");
  assert.equal(result.siteName, "霧島太陽光発電所");
  assert.equal(result.start, "08:00");
  assert.equal(result.end, "17:00");
  assert.equal(result.personnelNames, "子野井");
  assert.deepEqual(result.work, ["草刈り"]);
  assert.equal(result.businessTrip, true);
});

test("未登録の現場名と朝・夕方の時刻を読み取る", () => {
  const result = parseAttendanceVoice(
    "明日、熊本市、山田様邸、朝8時から夕方5時、清田、剪定",
    [],
    workers,
    works,
    baseDate,
  );
  assert.equal(result.siteName, "山田様邸");
  assert.equal(result.start, "08:00");
  assert.equal(result.end, "17:00");
});

test("8時から5時を日中の17時終了として読み取る", () => {
  const result = parseAttendanceVoice("9月28日、8時から5時、作業者は子野井、作業は草刈り", [], workers, works, baseDate);
  assert.equal(result.start, "08:00");
  assert.equal(result.end, "17:00");
  assert.equal(result.personnelNames, "子野井");
});

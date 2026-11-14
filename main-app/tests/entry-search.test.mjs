import assert from "node:assert/strict";
import test from "node:test";
import { matchesEntrySearch } from "../app/lib/entry-search.ts";

const entry = {
  id: "1",
  date: "2026-11-14",
  type: "1日",
  start: "08:00",
  end: "17:00",
  site: "高森邸",
  location: "島崎",
  address: "熊本県熊本市西区島崎5丁目",
  coordinates: "",
  personnelNames: "坂口、子野井",
  work: "剪定・草取り",
  note: "玄関側を仕上げる",
  weather: "晴れ",
  workMode: "通常勤務",
  businessTrip: false,
  dinnerType: "",
  hotelName: "",
  googleEventId: "",
  deletedAt: "",
  syncStatus: "",
  syncError: "",
  lastSyncedAt: "",
  lastModifiedSource: "",
  updatedAt: "",
};

test("現場名・住所・作業者・作業内容・メモを検索できる", () => {
  for (const query of ["高森邸", "島崎5丁目", "坂口", "草取り", "玄関側"])
    assert.equal(matchesEntrySearch(entry, query), true, query);
});

test("空白区切りの複数キーワードをすべて含む記録だけに絞る", () => {
  assert.equal(matchesEntrySearch(entry, "高森邸 草取り 坂口"), true);
  assert.equal(matchesEntrySearch(entry, "高森邸 伐採"), false);
});

test("日付の複数表記を検索できる", () => {
  assert.equal(matchesEntrySearch(entry, "2026/11/14"), true);
  assert.equal(matchesEntrySearch(entry, "2026年11月14日"), true);
});

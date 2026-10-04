import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarEventTitle,
  calendarRecordStatus,
} from "../app/lib/calendar-title.ts";

test("未来の予定でもGoogleカレンダーのタイトルへ予定表示を付けない", () => {
  assert.equal(
    calendarEventTitle("山口 防府@協和発酵バイオ①", "草刈り"),
    "山口 防府@協和発酵バイオ①【草刈り】",
  );
  assert.doesNotMatch(
    calendarEventTitle("山口 防府@協和発酵バイオ①", "草刈り"),
    /【予定】/,
  );
});

test("昨日以前は実績、明日以降は予定としてGoogleへ同期する", () => {
  assert.equal(calendarRecordStatus("2026-10-03", "2026-10-04"), "実績");
  assert.equal(calendarRecordStatus("2026-10-04", "2026-10-04"), "実績");
  assert.equal(calendarRecordStatus("2026-10-05", "2026-10-04"), "予定");
});

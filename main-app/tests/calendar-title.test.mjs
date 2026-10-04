import test from "node:test";
import assert from "node:assert/strict";
import { calendarEventTitle } from "../app/lib/calendar-title.ts";

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

import test from "node:test";
import assert from "node:assert/strict";
import {
  isBeforeCurrentDate,
  isCurrentUsersPlan,
  isPlanEnded,
} from "../app/lib/schedule-visibility.ts";

test("勤務記録には前日までの日付だけを表示する", () => {
  assert.equal(isBeforeCurrentDate("2026-09-18", "2026-09-19"), true);
  assert.equal(isBeforeCurrentDate("2026-09-19", "2026-09-19"), false);
  assert.equal(isBeforeCurrentDate("2026-09-20", "2026-09-19"), false);
});

test("予定は本人を含むものと作業者未指定のものだけを表示する", () => {
  assert.equal(isCurrentUsersPlan(["子野井、清田"], "子野井"), true);
  assert.equal(isCurrentUsersPlan(["清田、坂口"], "子野井"), false);
  assert.equal(isCurrentUsersPlan([""], "子野井"), true);
});

test("終了時刻を過ぎた今日の予定を終了済みと判定する", () => {
  assert.equal(isPlanEnded("2026-09-28", ["09:00"], "2026-09-28", "09:01"), true);
  assert.equal(isPlanEnded("2026-09-28", ["09:00", "17:00"], "2026-09-28", "12:00"), false);
  assert.equal(isPlanEnded("2026-09-29", ["09:00"], "2026-09-28", "18:00"), false);
  assert.equal(isPlanEnded("2026-09-27", ["17:00"], "2026-09-28", "08:00"), true);
});

import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWeather, WEATHER_OPTIONS, weatherIcon } from "../app/lib/weather.ts";

test("基本と組み合わせを含む幅広い天気を選べる", () => {
  assert.equal(WEATHER_OPTIONS.length, 43);
  for (const weather of ["晴れ", "雷雨", "晴れのち雨", "曇り時々雨", "雪一時晴れ"]) {
    assert.ok(WEATHER_OPTIONS.includes(weather));
    assert.equal(normalizeWeather(weather), weather);
  }
});

test("一覧表示用の天気アイコンを選ぶ", () => {
  assert.equal(weatherIcon("晴れ"), "☀️");
  assert.equal(weatherIcon("曇り時々雨"), "🌦️");
  assert.equal(weatherIcon("雷雨"), "⛈️");
});

test("選択肢にない値は保存しない", () => {
  assert.equal(normalizeWeather("台風"), "");
  assert.equal(normalizeWeather(undefined), "");
});

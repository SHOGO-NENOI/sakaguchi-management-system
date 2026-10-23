export const WEATHER_GROUPS = [
  {
    label: "基本",
    options: ["晴れ", "曇り", "雨", "雪", "みぞれ", "雷雨", "強風"],
  },
  {
    label: "のち",
    options: [
      "晴れのち曇り", "晴れのち雨", "晴れのち雪",
      "曇りのち晴れ", "曇りのち雨", "曇りのち雪",
      "雨のち晴れ", "雨のち曇り", "雨のち雪",
      "雪のち晴れ", "雪のち曇り", "雪のち雨",
    ],
  },
  {
    label: "時々",
    options: [
      "晴れ時々曇り", "晴れ時々雨", "晴れ時々雪",
      "曇り時々晴れ", "曇り時々雨", "曇り時々雪",
      "雨時々晴れ", "雨時々曇り", "雨時々雪",
      "雪時々晴れ", "雪時々曇り", "雪時々雨",
    ],
  },
  {
    label: "一時",
    options: [
      "晴れ一時曇り", "晴れ一時雨", "晴れ一時雪",
      "曇り一時晴れ", "曇り一時雨", "曇り一時雪",
      "雨一時晴れ", "雨一時曇り", "雨一時雪",
      "雪一時晴れ", "雪一時曇り", "雪一時雨",
    ],
  },
] as const;

export const WEATHER_OPTIONS = WEATHER_GROUPS.flatMap((group) => group.options);

export function normalizeWeather(value: unknown) {
  const weather = typeof value === "string" ? value.trim() : "";
  return WEATHER_OPTIONS.some((option) => option === weather) ? weather : "";
}

export function weatherIcon(weather: string) {
  if (weather.includes("雷")) return "⛈️";
  if (weather.includes("雪") || weather.includes("みぞれ")) return "🌨️";
  if (weather.includes("雨")) return "🌦️";
  if (weather.includes("曇り")) return "⛅";
  if (weather.includes("晴れ")) return "☀️";
  if (weather.includes("強風")) return "🌬️";
  return "";
}

export type VoiceSiteOption = {
  site: string;
  location: string;
  address: string;
  coordinates: string;
};

export type AttendanceVoiceResult = {
  transcript: string;
  date?: string;
  type?: "1日" | "半日" | "休み";
  businessTrip?: boolean;
  site?: VoiceSiteOption;
  siteName?: string;
  location?: string;
  start?: string;
  end?: string;
  personnelNames?: string;
  work?: string[];
};

const japaneseDigits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const compact = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase();

function numberOf(value: string) {
  const normalized = value.normalize("NFKC");
  if (/^\d+$/.test(normalized)) return Number(normalized);
  if (normalized === "十") return 10;
  if (normalized.includes("十")) {
    const [tens, ones] = normalized.split("十");
    return (tens ? japaneseDigits[tens] || 0 : 1) * 10 + (ones ? japaneseDigits[ones] || 0 : 0);
  }
  return japaneseDigits[normalized];
}

function clock(hourText: string, minuteText = "", half = "") {
  const hour = numberOf(hourText);
  const minute = half ? 30 : minuteText ? numberOf(minuteText) : 0;
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function times(text: string) {
  const number = "([0-9０-９一二三四五六七八九十]{1,3})";
  const matched = text.match(new RegExp(`${number}時(?:(?:${number}分)|(半))?(?:から|より|〜|~|-)${number}時(?:(?:${number}分)|(半))?(?:まで)?`));
  if (matched) return { start: clock(matched[1], matched[2], matched[3]), end: clock(matched[4], matched[5], matched[6]) };
  const colon = text.normalize("NFKC").match(/(\d{1,2}):([0-5]\d)(?:から|より|〜|~|-)(\d{1,2}):([0-5]\d)/);
  return colon ? { start: clock(colon[1], colon[2]), end: clock(colon[3], colon[4]) } : {};
}

export function parseVoiceDate(text: string, base = new Date()) {
  const normalized = text.normalize("NFKC");
  const relative = normalized.includes("明後日") ? 2 : normalized.includes("明日") ? 1 : normalized.includes("今日") ? 0 : null;
  if (relative !== null) {
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + relative);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  const full = normalized.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  const short = normalized.match(/(\d{1,2})月(\d{1,2})日/);
  const year = full ? Number(full[1]) : base.getFullYear();
  const month = Number(full?.[2] || short?.[1]);
  const day = Number(full?.[3] || short?.[2]);
  if (!month || !day || month > 12 || day > 31) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function labelled(text: string, label: string) {
  return text.match(new RegExp(`${label}(?:は|:|：)?([^、,。]+)`))?.[1]?.trim();
}

export function parseAttendanceVoice(
  transcript: string,
  sites: VoiceSiteOption[],
  workers: string[],
  workOptions: string[],
): AttendanceVoiceResult {
  const normalized = compact(transcript);
  const matchedSite = [...sites].sort((a, b) => b.site.length - a.site.length).find((option) => option.site && normalized.includes(compact(option.site)));
  const knownWorkers = [...new Set(workers)].filter((name) => name && normalized.includes(compact(name)));
  const work = [...new Set(workOptions)].filter((name) => name && normalized.includes(compact(name)));
  const segments = transcript.split(/[、,。\n]+/).map((part) => part.trim()).filter(Boolean);
  const location = labelled(transcript, "場所") || labelled(transcript, "地域") || matchedSite?.location || segments.find((part) => /[都道府県市区町村郡]/.test(part) && !/時/.test(part));
  const siteName = labelled(transcript, "現場名") || matchedSite?.site;
  const type = normalized.includes("休み") ? "休み" : normalized.includes("半日") ? "半日" : normalized.includes("一日") || normalized.includes("1日") ? "1日" : undefined;
  const spokenTimes = times(transcript);
  return {
    transcript,
    ...(parseVoiceDate(transcript) ? { date: parseVoiceDate(transcript) } : {}),
    ...(type ? { type } : {}),
    ...(normalized.includes("出張") ? { businessTrip: true } : {}),
    ...(matchedSite ? { site: matchedSite } : {}),
    ...(siteName ? { siteName } : {}),
    ...(location ? { location } : {}),
    ...spokenTimes,
    ...(knownWorkers.length ? { personnelNames: knownWorkers.join("、") } : {}),
    ...(work.length ? { work } : {}),
  };
}

export function voiceResultLines(result: AttendanceVoiceResult) {
  return [
    result.date && `日付：${result.date}`,
    result.type && `勤務区分：${result.type}`,
    result.businessTrip && "出張：あり",
    result.location && `場所：${result.location}`,
    result.siteName && `現場名：${result.siteName}`,
    result.start && `開始：${result.start}`,
    result.end && `終了：${result.end}`,
    result.personnelNames && `作業者：${result.personnelNames}`,
    result.work?.length && `作業内容：${result.work.join("、")}`,
  ].filter((line): line is string => Boolean(line));
}

export function nextAssistantQuestion(result: AttendanceVoiceResult) {
  if (!result.date) return "日付はいつですか？";
  if (!result.type) return "1日、半日、休みのどれですか？";
  if (result.type === "休み") return "入力内容がそろいました。フォームへ反映して確認してください。";
  if (!result.location) return "場所・地域はどこですか？";
  if (!result.siteName) return "現場名を教えてください。";
  if (!result.start) return "開始時間は何時ですか？";
  if (!result.end) return "終了時間は何時ですか？";
  if (!result.personnelNames) return "作業者は誰ですか？";
  if (!result.work?.length) return "作業内容を教えてください。";
  return "入力内容がそろいました。フォームへ反映して確認してください。";
}

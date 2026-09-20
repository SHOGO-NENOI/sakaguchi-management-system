import type { CustomAllowance, Entry, PaySettings, SummaryPeriod } from "@/app/types";

type HolidayRange = { start: string; end: string; label: string };

type SummaryTabProps = {
  summaryPeriod: SummaryPeriod;
  setSummaryPeriod: (value: SummaryPeriod) => void;
  selectedYear: string;
  month: string;
  setMonth: (value: string) => void;
  entries: Entry[];
  today: () => string;
  setBulkPlanMessage: (value: string) => void;
  bulkPlanMessage: string;
  bulkPlanning: boolean;
  createBasicSchedule: () => void;
  toggleHolidayRange: () => void;
  showHolidayRange: boolean;
  holidayRange: HolidayRange;
  setHolidayRange: (value: HolidayRange) => void;
  createHolidayRange: () => void;
  holidayRangeSaving: boolean;
  holidayRangeMessage: string;
  summary: {
    days: number;
    work: number;
    early: number;
    overtime: number;
    trips: number;
    selfDinner: number;
  };
  formatMinutes: (minutes: number) => string;
  annualHotelNights: number;
  estimatedPay: {
    base: number;
    extra: number;
    weeklyExtra: number;
    tripAllowance: number;
    customAllowances: { id: string; name: string; amount: number }[];
    total: number;
  } | null;
  paySettings: PaySettings;
  updatePaySettings: (value: PaySettings) => void;
  addCustomAllowance: () => void;
  updateCustomAllowance: (
    id: string,
    patch: Partial<Omit<CustomAllowance, "id">>,
  ) => void;
  removeCustomAllowance: (id: string) => void;
  plannedMonthEntries: Entry[];
  selfDinnerEntries: Entry[];
  formatDate: (value: string) => string;
  annualRankings: {
    sites: [string, number][];
    people: [string, number][];
    hotels: [string, number][];
  };
};

export default function SummaryTab({
  summaryPeriod,
  setSummaryPeriod,
  selectedYear,
  month,
  setMonth,
  entries,
  today,
  setBulkPlanMessage,
  bulkPlanMessage,
  bulkPlanning,
  createBasicSchedule,
  toggleHolidayRange,
  showHolidayRange,
  holidayRange,
  setHolidayRange,
  createHolidayRange,
  holidayRangeSaving,
  holidayRangeMessage,
  summary,
  formatMinutes,
  annualHotelNights,
  estimatedPay,
  paySettings,
  updatePaySettings,
  addCustomAllowance,
  updateCustomAllowance,
  removeCustomAllowance,
  plannedMonthEntries,
  selfDinnerEntries,
  formatDate,
  annualRankings,
}: SummaryTabProps) {
  return (
    <section className="summary-section">
      <div className="section-heading history-heading">
        <div>
          <span className="eyebrow">
            {summaryPeriod === "annual"
              ? "ANNUAL SUMMARY"
              : "MONTHLY SUMMARY"}
          </span>
          <h2>{summaryPeriod === "annual" ? "年間集計" : "月間集計"}</h2>
        </div>
        <div className="monthly-controls">
          <div className="summary-period-switch" aria-label="集計期間">
            <button
              type="button"
              className={summaryPeriod === "monthly" ? "active" : ""}
              aria-pressed={summaryPeriod === "monthly"}
              onClick={() => setSummaryPeriod("monthly")}
            >
              月間
            </button>
            <button
              type="button"
              className={summaryPeriod === "annual" ? "active" : ""}
              aria-pressed={summaryPeriod === "annual"}
              onClick={() => setSummaryPeriod("annual")}
            >
              年間
            </button>
          </div>
          {summaryPeriod === "annual" ? (
            <select
              aria-label="表示する年"
              className="year-input"
              value={selectedYear}
              onChange={(e) =>
                setMonth(`${e.target.value}-${month.slice(5, 7)}`)
              }
            >
              {Array.from(
                new Set([
                  today().slice(0, 4),
                  ...entries.map((entry) => entry.date.slice(0, 4)),
                ]),
              )
                .sort((a, b) => b.localeCompare(a))
                .map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
            </select>
          ) : (
            <>
              <input
                aria-label="表示する月"
                className="month-input"
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setBulkPlanMessage("");
                }}
              />
              <div className="schedule-buttons">
                <button
                  className="basic-plan-button"
                  type="button"
                  onClick={createBasicSchedule}
                  disabled={bulkPlanning}
                >
                  {bulkPlanning ? "作成中…" : "基本予定を入れる"}
                </button>
                <button
                  className="holiday-range-button"
                  type="button"
                  onClick={toggleHolidayRange}
                >
                  連休を設定
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {summaryPeriod === "monthly" && bulkPlanMessage && (
        <p
          className={`bulk-plan-message ${bulkPlanMessage.includes("登録しました") ? "success" : ""}`}
        >
          {bulkPlanMessage}
        </p>
      )}
      {summaryPeriod === "monthly" && showHolidayRange && (
        <div className="holiday-range-panel">
          <div className="holiday-range-fields">
            <label>
              <span>開始日</span>
              <input
                type="date"
                value={holidayRange.start}
                onChange={(e) =>
                  setHolidayRange({
                    ...holidayRange,
                    start: e.target.value,
                    end:
                      holidayRange.end < e.target.value
                        ? e.target.value
                        : holidayRange.end,
                  })
                }
              />
            </label>
            <label>
              <span>終了日</span>
              <input
                type="date"
                min={holidayRange.start || undefined}
                value={holidayRange.end}
                onChange={(e) =>
                  setHolidayRange({
                    ...holidayRange,
                    end: e.target.value,
                  })
                }
              />
            </label>
            <label className="holiday-name">
              <span>連休の名前</span>
              <input
                placeholder="例：お盆休み・年末年始"
                value={holidayRange.label}
                onChange={(e) =>
                  setHolidayRange({
                    ...holidayRange,
                    label: e.target.value,
                  })
                }
              />
            </label>
          </div>
          <button
            type="button"
            onClick={createHolidayRange}
            disabled={holidayRangeSaving}
          >
            {holidayRangeSaving
              ? "設定しています…"
              : "この期間を休みにする"}
          </button>
          {holidayRangeMessage && <p>{holidayRangeMessage}</p>}
        </div>
      )}
      <div className="summary-grid">
        <article>
          <span className="summary-icon blue">日</span>
          <div>
            <small>勤務日数</small>
            <strong>
              {summary.days}
              <span>日</span>
            </strong>
          </div>
        </article>
        <article>
          <span className="summary-icon work">時</span>
          <div>
            <small>総労働時間</small>
            <strong>{formatMinutes(summary.work)}</strong>
          </div>
        </article>
        <article>
          <span className="summary-icon amber">早</span>
          <div>
            <small>早出合計</small>
            <strong>{formatMinutes(summary.early)}</strong>
          </div>
        </article>
        <article>
          <span className="summary-icon coral">残</span>
          <div>
            <small>残業合計</small>
            <strong>{formatMinutes(summary.overtime)}</strong>
          </div>
        </article>
        <article>
          <span className="summary-icon trip">出</span>
          <div>
            <small>出張日数</small>
            <strong>
              {summary.trips}
              <span>日</span>
            </strong>
          </div>
        </article>
        <article className="dinner-summary">
          <span className="summary-icon dinner">食</span>
          <div>
            <small>自費で夜ご飯</small>
            <strong>
              {summary.selfDinner}
              <span>回</span>
            </strong>
          </div>
        </article>
        <article className="hotel-summary">
          <span className="summary-icon hotel">泊</span>
          <div>
            <small>{month.slice(0, 4)}年ホテル</small>
            <strong>
              {annualHotelNights}
              <span>泊</span>
            </strong>
          </div>
        </article>
      </div>
      <div className="pay-estimate-card">
        <div className="pay-estimate-main">
          <span className="pay-icon">給</span>
          <div>
            <small>概算給与（控除前）</small>
            <strong>
              {estimatedPay
                ? `¥${estimatedPay.total.toLocaleString("ja-JP")}`
                : "日給を設定してください"}
            </strong>
          </div>
        </div>
        {estimatedPay && (
          <div className="pay-breakdown">
            <span>
              基本給 ¥{estimatedPay.base.toLocaleString("ja-JP")}
            </span>
            <span>
              早出・残業 ¥{estimatedPay.extra.toLocaleString("ja-JP")}
            </span>
            {estimatedPay.weeklyExtra > 0 && (
              <span>
                週40時間超過分 ¥{estimatedPay.weeklyExtra.toLocaleString("ja-JP")}
              </span>
            )}
            {estimatedPay.tripAllowance > 0 && (
              <span>
                出張手当 ¥{estimatedPay.tripAllowance.toLocaleString("ja-JP")}
              </span>
            )}
            {estimatedPay.customAllowances.map((allowance) => (
              <span key={allowance.id}>
                {allowance.name} ¥{allowance.amount.toLocaleString("ja-JP")}
              </span>
            ))}
          </div>
        )}
        <details className="pay-settings">
          <summary>給与設定</summary>
          <div>
            <label>
              <span>日給</span>
              <div className="pay-input-wrap">
                <b>¥</b>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="100"
                  placeholder="例：10000"
                  value={paySettings.dailyRate}
                  onChange={(e) =>
                    updatePaySettings({
                      ...paySettings,
                      dailyRate: e.target.value,
                    })
                  }
                />
              </div>
            </label>
            <label>
              <span>1日の所定時間</span>
              <div className="pay-input-wrap">
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="24"
                  step="0.5"
                  value={paySettings.standardHours}
                  onChange={(e) =>
                    updatePaySettings({
                      ...paySettings,
                      standardHours: e.target.value,
                    })
                  }
                />
                <b>時間</b>
              </div>
            </label>
            <label>
              <span>早出・残業倍率</span>
              <div className="pay-input-wrap">
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="0.05"
                  value={paySettings.overtimeMultiplier}
                  onChange={(e) =>
                    updatePaySettings({
                      ...paySettings,
                      overtimeMultiplier: e.target.value,
                    })
                  }
                />
                <b>倍</b>
              </div>
            </label>
            <label>
              <span>出張手当（1日あたり）</span>
              <div className="pay-input-wrap">
                <b>¥</b>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="100"
                  placeholder="例：1500"
                  value={paySettings.tripAllowance}
                  onChange={(e) =>
                    updatePaySettings({
                      ...paySettings,
                      tripAllowance: e.target.value,
                    })
                  }
                />
              </div>
            </label>
            <div className="custom-allowances">
              <span className="custom-allowances-label">
                その他の手当 <em>任意・役職手当など自由に追加できます</em>
              </span>
              {paySettings.customAllowances.map((allowance) => (
                <div className="custom-allowance-row" key={allowance.id}>
                  <input
                    type="text"
                    placeholder="例：役職手当"
                    value={allowance.name}
                    onChange={(e) =>
                      updateCustomAllowance(allowance.id, {
                        name: e.target.value,
                      })
                    }
                  />
                  <div className="pay-input-wrap">
                    <b>¥</b>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="100"
                      placeholder="例：5000"
                      value={allowance.amount}
                      onChange={(e) =>
                        updateCustomAllowance(allowance.id, {
                          amount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <select
                    value={allowance.period}
                    onChange={(e) =>
                      updateCustomAllowance(allowance.id, {
                        period: e.target.value as "day" | "month",
                      })
                    }
                  >
                    <option value="day">1日あたり</option>
                    <option value="month">1ヶ月あたり</option>
                  </select>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeCustomAllowance(allowance.id)}
                    aria-label={`${allowance.name || "手当"}を削除`}
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-custom-allowance"
                onClick={addCustomAllowance}
              >
                ＋ 手当を追加
              </button>
            </div>
            <p>
              計算：日給×勤務日数（半日は0.5日）＋早出・残業時間×日給換算の時間単価×倍率＋週40時間を超えた分×日給換算の時間単価×倍率＋出張日数×出張手当＋その他の手当。税金・保険などは含まない概算です。
            </p>
          </div>
        </details>
      </div>
      {summaryPeriod === "monthly" && plannedMonthEntries.length > 0 && (
        <p className="planned-summary">
          この月の勤務予定：
          <strong>{plannedMonthEntries.length}件</strong>
          （月間実績には含めていません）
        </p>
      )}
      {summaryPeriod === "monthly" && selfDinnerEntries.length > 0 && (
        <details className="self-dinner-details">
          <summary>
            <strong>自費で夜ご飯を食べた日</strong>
            <span>{selfDinnerEntries.length}件</span>
          </summary>
          <div className="dinner-date-list">
            {selfDinnerEntries.map((entry) => (
              <time key={entry.id} dateTime={entry.date}>
                {formatDate(entry.date)}
              </time>
            ))}
          </div>
        </details>
      )}
      <div className="monthly-rankings">
        <article>
          <div className="ranking-title">
            <strong>よく行った現場</strong>
            <span>{selectedYear}年 上位5件</span>
          </div>
          <div className="ranking-content">
            {annualRankings.sites.length ? (
              <ol>
                {annualRankings.sites.map(([name, count]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <strong>{count}回</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p>この年の現場記録はありません</p>
            )}
          </div>
        </article>
        <article>
          <div className="ranking-title">
            <strong>一緒に働いた人</strong>
            <span>{selectedYear}年 上位5名</span>
          </div>
          <div className="ranking-content">
            {annualRankings.people.length ? (
              <ol>
                {annualRankings.people.map(([name, count]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <strong>{count}回</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p>この年の作業者記録はありません</p>
            )}
          </div>
        </article>
        <article>
          <div className="ranking-title">
            <strong>よく泊まったホテル</strong>
            <span>{selectedYear}年 上位5件</span>
          </div>
          <div className="ranking-content">
            {annualRankings.hotels.length ? (
              <ol>
                {annualRankings.hotels.map(([name, count]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <strong>{count}泊</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p>この年のホテル記録はありません</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

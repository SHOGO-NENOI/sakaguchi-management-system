import type { Dispatch, SetStateAction } from "react";
import { groupRecordsByDate } from "@/app/lib/group-records";
import {
  SITE_SEPARATOR,
  entrySiteRows,
  extraMinutes,
  displayWorkSummary,
  formatMinutes,
  formatDate,
  fullDateLabel,
  mapsUrl,
  navigationUrl,
  siteCardKey,
  today,
} from "@/app/lib/entry-helpers";
import type { AppTab, Entry, SiteDocument } from "@/app/types";

type PlanSection = { id: string; title: string; date: string; entries: Entry[] };
type CalendarDay = { day: number; date: string; entries: Entry[] } | null;

type HistoryPlansTabProps = {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  historyView: "list" | "calendar";
  setHistoryView: (value: "list" | "calendar") => void;
  month: string;
  setMonth: (value: string) => void;
  visibleRecordEntries: Entry[];
  planBoardEntries: Entry[];
  selectedPlanIds: string[];
  setSelectedPlanIds: Dispatch<SetStateAction<string[]>>;
  removeMany: (ids: string[]) => void;
  ready: boolean;
  calendarDays: CalendarDay[];
  calendarHolidays: Map<string, string>;
  edit: (entry: Entry) => void;
  planSections: PlanSection[];
  siteDocumentsByKey: Record<string, SiteDocument[]>;
  siteDocumentLoadingKey: string | null;
  siteDocumentMessages: Record<string, string>;
  loadSiteDocuments: (siteKey: string, force?: boolean) => void;
  remove: (id: string) => void;
};

export default function HistoryPlansTab({
  activeTab,
  setActiveTab,
  historyView,
  setHistoryView,
  month,
  setMonth,
  visibleRecordEntries,
  planBoardEntries,
  selectedPlanIds,
  setSelectedPlanIds,
  removeMany,
  ready,
  calendarDays,
  calendarHolidays,
  edit,
  planSections,
  siteDocumentsByKey,
  siteDocumentLoadingKey,
  siteDocumentMessages,
  loadSiteDocuments,
  remove,
}: HistoryPlansTabProps) {
  return (
    <section className="history-section">
      <div className="section-heading history-heading">
        <div>
          <span className="eyebrow">
            {activeTab === "plans"
              ? "共有スケジュール"
              : "過去の記録"}
          </span>
          <div className="heading-title-line">
            <h2>{activeTab === "plans" ? "予定" : "勤務履歴"}</h2>
            {activeTab === "history" && <time dateTime={today()}>{fullDateLabel(today())}</time>}
          </div>
        </div>
        <button type="button" className="plan-add-button" onClick={() => setActiveTab("entry")}>
          {activeTab === "plans" ? "＋ 予定を入力" : "＋ 記録を入力"}
        </button>
      </div>
      <div className="plan-view-row">
        <div className="history-tools">
          {(activeTab === "history" || historyView === "calendar") && <input
            aria-label="表示する月"
            className="month-input"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />}
          <div className="view-switch" aria-label="表示方法">
            <button
              type="button"
              className={historyView === "list" ? "active" : ""}
              aria-pressed={historyView === "list"}
              onClick={() => setHistoryView("list")}
            >
              一覧
            </button>
            <button
              type="button"
              className={historyView === "calendar" ? "active" : ""}
              aria-pressed={historyView === "calendar"}
              onClick={() => setHistoryView("calendar")}
            >
              カレンダー
            </button>
          </div>
          {activeTab === "history" && <span className="count">{visibleRecordEntries.reduce((total, entry) => total + (entry.type === "休み" ? 1 : Math.max(1, entrySiteRows(entry).length)), 0)}件</span>}
        </div>
      </div>
      {activeTab === "plans" &&
        historyView === "list" &&
        planBoardEntries.length > 0 && (
          <details className="plan-bulk-details">
            <summary>予定をまとめて操作</summary>
          <div className="plan-bulk-toolbar">
            <label>
              <input
                type="checkbox"
                checked={
                  selectedPlanIds.length === planBoardEntries.length
                }
                ref={(input) => {
                  if (input)
                    input.indeterminate =
                      selectedPlanIds.length > 0 &&
                      selectedPlanIds.length <
                        planBoardEntries.length;
                }}
                onChange={(event) =>
                  setSelectedPlanIds(
                    event.target.checked
                      ? planBoardEntries.map((entry) => entry.id)
                      : [],
                  )
                }
              />
              表示中の予定を全選択
            </label>
            <span>{selectedPlanIds.length}件選択中</span>
            <button
              type="button"
              disabled={!selectedPlanIds.length}
              onClick={() => removeMany(selectedPlanIds)}
            >
              選択した予定を削除
            </button>
          </div>
          </details>
        )}
      {!ready ? (
        <div className="empty">
          <h3>記録を読み込んでいます…</h3>
        </div>
      ) : visibleRecordEntries.length === 0 && activeTab === "history" && historyView === "list" ? (
        <div className="empty">
          <span>記</span>
          <h3>この月の勤務記録はありません</h3>
          <p>「＋ 記録を入力」から勤務内容を登録すると、ここに表示されます。</p>
        </div>
      ) : historyView === "calendar" ? (
        <div className="calendar-wrap">
          <div className="calendar-weekdays">
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((item, index) =>
              item ? (
                <div
                  className={`calendar-day ${item.entries.length ? "has-entry" : ""} ${calendarHolidays.has(item.date) ? "holiday" : ""}`}
                  key={item.date}
                >
                  <span className="calendar-date">{item.day}</span>
                  {calendarHolidays.has(item.date) && (
                    <span className="holiday-name">
                      {calendarHolidays.get(item.date)}
                    </span>
                  )}
                  {item.entries.map((entry) => {
                    const extra = extraMinutes(entry);
                    const planned = entry.date > today();
                    const siteLabel =
                      entry.type === "休み"
                        ? entry.note
                        : displayWorkSummary(entry.location, entry.site, entry.work);
                    const workColor =
                      entry.type === "休み"
                        ? "work-off"
                        : entry.businessTrip
                          ? "work-trip"
                          : "work-normal";
                    return (
                      <button
                        type="button"
                        className={`calendar-entry ${planned ? "planned" : ""} ${workColor}`}
                        key={entry.id}
                        onClick={() => edit(entry)}
                        aria-label={`${formatDate(entry.date)}の${planned ? "予定" : "記録"}を編集`}
                      >
                        <strong>
                          {entry.type === "休み"
                            ? entry.note || "休み"
                            : planned
                              ? "予定"
                              : entry.type}
                        </strong>
                        {entry.type !== "休み" && siteLabel && (
                          <span>{siteLabel}</span>
                        )}
                        {entry.type !== "休み" && (
                          <small>
                            {planned
                              ? entry.type
                              : [
                                  extra.early
                                    ? `早 ${formatMinutes(extra.early)}`
                                    : "",
                                  extra.overtime
                                    ? `残 ${formatMinutes(extra.overtime)}`
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join("・")}
                          </small>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="calendar-day blank"
                  key={`blank-${index}`}
                />
              ),
            )}
          </div>
          <p className="calendar-note">
            記録のある日を押すと編集できます
          </p>
        </div>
      ) : (
        <div className={activeTab === "plans" ? "plan-board" : ""}>
          {(activeTab === "plans" ? planSections : [{ id: "history", title: "", date: "", entries: visibleRecordEntries }]).map((section) => (
            <section className={activeTab === "plans" ? `plan-panel plan-panel-${section.id}` : "history-results"} key={section.id}>
              {activeTab === "plans" && (
                <div className="plan-panel-heading">
                  <div>
                    <h3>{section.title}</h3>
                    {section.date && <time dateTime={section.date}>{fullDateLabel(section.date)}</time>}
                  </div>
                  <span>{section.entries.reduce((total, entry) => total + (entry.type === "休み" ? 1 : Math.max(1, entrySiteRows(entry).length)), 0)}件</span>
                </div>
              )}
              {section.entries.length ? (
        <div className="history-list">
          {groupRecordsByDate(section.entries).map((group) => (
            <section className="history-day" key={group.date} aria-label={`${formatDate(group.date)}の${activeTab === "plans" ? "予定" : "勤務記録"} ${group.entries.reduce((total, entry) => total + (entry.type === "休み" ? 1 : Math.max(1, entrySiteRows(entry).length)), 0)}件`}>
              <div className="date-block">
                <strong>
                  {formatDate(group.date).split("(")[0]}
                  {calendarHolidays.has(group.date) && (
                    <em className="holiday-flag" title={calendarHolidays.get(group.date)} aria-label={calendarHolidays.get(group.date)}>🇯🇵</em>
                  )}
                </strong>
                <span>{formatDate(group.date).match(/\((.+)\)/)?.[1]}</span>
                {group.entries.reduce((total, entry) => total + (entry.type === "休み" ? 1 : Math.max(1, entrySiteRows(entry).length)), 0) > 1 && <small>{group.entries.reduce((total, entry) => total + (entry.type === "休み" ? 1 : Math.max(1, entrySiteRows(entry).length)), 0)}件</small>}
              </div>
              <div className="history-day-entries">
          {group.entries.map((entry) => {
            const extra = extraMinutes(entry);
            const planned = activeTab === "plans" || entry.date > today();
            const siteRows = entry.type === "休み" ? [] : entrySiteRows(entry);
            const startTimes = entry.start.split(SITE_SEPARATOR);
            const endTimes = entry.end.split(SITE_SEPARATOR);
            const workColor =
              entry.type === "休み"
                ? "work-off"
                : entry.businessTrip
                  ? "work-trip"
                  : "work-normal";
            return (
              <article
                className={`history-item ${planned ? "planned" : ""} ${workColor} ${selectedPlanIds.includes(entry.id) ? "selected" : ""}`}
                key={entry.id}
              >
                {activeTab === "plans" && (
                  <label className="plan-select">
                    <input
                      type="checkbox"
                      aria-label={`${entry.date}の予定を選択`}
                      checked={selectedPlanIds.includes(entry.id)}
                      onChange={(event) =>
                        setSelectedPlanIds((current) =>
                          event.target.checked
                            ? [...current, entry.id]
                            : current.filter((id) => id !== entry.id),
                        )
                      }
                    />
                  </label>
                )}
                <div className="record-main">
                  <div className="record-top">
                    {planned && (
                      <span className="planned-badge">予定</span>
                    )}
                    <span className={`type-badge type-${entry.type}`}>
                      {entry.type}
                    </span>
                  </div>
                  {siteRows.length ? (
                    <div className="record-site-list">
                      {siteRows.map((row, index) => {
                        const siteKey = siteCardKey(row);
                        const documents = siteDocumentsByKey[siteKey];
                        return <div className="record-site" key={`${entry.id}-site-${index}`}>
                          <p>{row.site || row.location || row.work || "現場名の記録なし"}</p>
                          <small className="record-detail">
                            {[row.location && row.site ? row.location : "", [startTimes[index] || startTimes[0], endTimes[index] || endTimes[0]].filter(Boolean).join("〜"), activeTab === "history" ? row.personnelNames : "", row.work].filter(Boolean).join("・")}
                          </small>
                          <div className="record-site-actions">
                            {(row.address || row.coordinates) && (
                              <a className="record-nav-link" href={navigationUrl(row.address, row.coordinates)} target="_blank" rel="noreferrer" aria-label={`${row.site || row.location || "現場"}まで車でナビを開く`}>🚗 ナビ開始</a>
                            )}
                            {(row.address || row.coordinates || row.site || row.location) && (
                              <a className="record-map-link" href={mapsUrl(row.address, row.coordinates, row.location, row.site)} target="_blank" rel="noreferrer" aria-label={`${row.site || row.location || `${index + 1}件目の現場`}の地図を開く`}>🗺️ 地図</a>
                            )}
                            {(row.site || row.location) && (
                              <details className="record-materials" onToggle={(event) => { if (event.currentTarget.open) void loadSiteDocuments(siteKey); }}>
                                <summary>📎 資料</summary>
                                <div className="record-materials-content">
                                  {siteDocumentLoadingKey === siteKey && !documents && <span role="status">読み込み中…</span>}
                                  {documents?.length === 0 && <span>資料はありません</span>}
                                  {documents?.map((document) => <a key={document.id} href={`/api/site-documents/file?id=${document.id}`} target="_blank" rel="noreferrer">{document.fileName} ↗</a>)}
                                  {siteDocumentMessages[siteKey] && <span role="status">{siteDocumentMessages[siteKey]}</span>}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>;
                      })}
                    </div>
                  ) : (
                    <p>{entry.type === "休み" ? entry.note || "休み" : displayWorkSummary(entry.location, entry.site, entry.work) || "現場名・作業内容の記録なし"}</p>
                  )}
                </div>
                <div className="record-extra">
                  {entry.businessTrip && (
                    <span className="trip-badge">
                      出張・夜：{entry.dinnerType || "未選択"}
                    </span>
                  )}
                  {entry.businessTrip && entry.hotelName && (
                    <span className="hotel-badge">
                      宿泊：{entry.hotelName}
                    </span>
                  )}
                  {extra.early > 0 && (
                    <span>早出 {formatMinutes(extra.early)}</span>
                  )}
                  {extra.overtime > 0 && (
                    <span>残業 {formatMinutes(extra.overtime)}</span>
                  )}
                </div>
                <div className="actions">
                  <button
                    onClick={() => edit(entry)}
                    aria-label={`${entry.date}を編集`}
                  >
                    編集
                  </button>
                  <button
                    className="delete"
                    onClick={() => remove(entry.id)}
                    aria-label={`${entry.date}を削除`}
                  >
                    削除
                  </button>
                </div>
              </article>
            );
          })}
              </div>
            </section>
          ))}
        </div>
              ) : activeTab === "plans" && (
                <div className="plan-panel-empty">予定はありません</div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

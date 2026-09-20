import type { FormEvent } from "react";
import {
  elapsedDays,
  formatDate,
  formatMinutes,
  fullDateLabel,
  mapsUrl,
  positionInputValue,
  splitNames,
  today,
} from "@/app/lib/entry-helpers";
import type { Entry, WorkType } from "@/app/types";

type EntryTabProps = {
  editingId: string | null;
  formIsPlanned: boolean;
  cancelEdit: () => void;
  form: Omit<Entry, "id">;
  setForm: (value: Omit<Entry, "id">) => void;
  submit: (event: FormEvent) => void;
  workTypes: WorkType[];
  offEndDate: string;
  setOffEndDate: (value: string) => void;
  knownSites: string[];
  knownLocations: string[];
  knownAddresses: string[];
  knownPersonnelNames: string[];
  formSites: string[];
  formLocations: string[];
  formAddresses: string[];
  formCoordinates: string[];
  formPersonnelNames: string[];
  formWorks: string[];
  formStarts: string[];
  formEnds: string[];
  formNotes: string[];
  GARBAGE_DISPOSAL_TRIGGERS: string[];
  GARBAGE_DISPOSAL_OPTION: string;
  previousSiteVisits: Record<string, Entry | null>;
  updateLocation: (index: number, value: string) => void;
  updateSite: (index: number, value: string) => void;
  updateStart: (index: number, value: string) => void;
  updateEnd: (index: number, value: string) => void;
  updatePosition: (index: number, value: string) => void;
  updatePersonnelNames: (index: number, value: string) => void;
  updateNote: (index: number, value: string) => void;
  needsTime: boolean;
  locatingSiteIndex: number | null;
  getCurrentAddress: (index: number) => void;
  locationLookupMessages: Record<number, string>;
  masterPersonnelNames: string[];
  toggleAllPersonnel: (index: number) => void;
  togglePersonnelName: (index: number, name: string) => void;
  knownWorkOptions: string[];
  toggleWork: (index: number, value: string) => void;
  addSite: () => void;
  removeSite: (index: number) => void;
  currentExtra: { early: number; overtime: number };
  knownHotels: string[];
  error: string;
  saving: boolean;
};

export default function EntryTab({
  editingId,
  formIsPlanned,
  cancelEdit,
  form,
  setForm,
  submit,
  workTypes,
  offEndDate,
  setOffEndDate,
  knownLocations,
  knownSites,
  knownAddresses,
  knownPersonnelNames,
  formSites,
  formLocations,
  formAddresses,
  formCoordinates,
  formPersonnelNames,
  formWorks,
  formStarts,
  formEnds,
  formNotes,
  GARBAGE_DISPOSAL_TRIGGERS,
  GARBAGE_DISPOSAL_OPTION,
  previousSiteVisits,
  updateLocation,
  updateSite,
  updateStart,
  updateEnd,
  updatePosition,
  updatePersonnelNames,
  updateNote,
  needsTime,
  locatingSiteIndex,
  getCurrentAddress,
  locationLookupMessages,
  masterPersonnelNames,
  toggleAllPersonnel,
  togglePersonnelName,
  knownWorkOptions,
  toggleWork,
  addSite,
  removeSite,
  currentExtra,
  knownHotels,
  error,
  saving,
}: EntryTabProps) {
  return (
    <section className="entry-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DAILY RECORD</span>
          <div className="heading-title-line">
            <h1>
              {editingId
                ? formIsPlanned
                  ? "勤務予定を編集"
                  : "勤務記録を編集"
                : formIsPlanned
                  ? "これからの勤務予定"
                  : "今日の勤務を記録"}
            </h1>
            <time dateTime={today()}>{fullDateLabel(today())}</time>
          </div>
        </div>
        {editingId && (
          <button
            className="text-button"
            type="button"
            onClick={cancelEdit}
          >
            編集をやめる
          </button>
        )}
      </div>

      <form onSubmit={submit}>
        <div
          className={`field-grid top-fields ${form.type === "休み" ? "off-mode" : ""}`}
        >
          {form.type !== "休み" && (
            <label>
              <span>日付</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => {
                  const date = e.target.value;
                  setForm({
                    ...form,
                    date,
                    dinnerType:
                      date <= today() && form.dinnerType === "未定"
                        ? ""
                        : form.dinnerType,
                  });
                }}
              />
              {formIsPlanned && (
                <small className="planned-hint">
                  未来の日付のため「予定」として保存します
                </small>
              )}
            </label>
          )}
          <fieldset>
            <legend>勤務区分</legend>
            <div className="segmented">
              {workTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={form.type === type ? "active" : ""}
                  onClick={() => {
                    setForm(
                      type === "休み"
                        ? {
                            ...form,
                            type,
                            start: "",
                            end: "",
                            site: "",
                            location: "",
                            address: "",
                            coordinates: "",
                            personnelNames: "",
                            work: "",
                            note: "",
                            businessTrip: false,
                            dinnerType: "",
                            hotelName: "",
                          }
                        : {
                            ...form,
                            type,
                            start: form.start || "08:00",
                            end: form.end || "17:00",
                          },
                    );
                    if (type === "休み") setOffEndDate(form.date);
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {form.type === "休み" ? (
          <div className="off-entry-panel">
            <div className="off-date-range">
              <label>
                <span>休みの開始日</span>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => {
                    const date = e.target.value;
                    setForm({ ...form, date });
                    if (offEndDate < date) setOffEndDate(date);
                  }}
                />
              </label>
              <span className="off-range-arrow">〜</span>
              <label>
                <span>休みの終了日</span>
                <input
                  type="date"
                  required
                  min={form.date}
                  value={offEndDate}
                  onChange={(e) => setOffEndDate(e.target.value)}
                />
              </label>
            </div>
            <label className="off-reason">
              <span>
                休みの理由 <em>任意</em>
              </span>
              <input
                placeholder="未入力の場合は「休み」になります"
                value={form.note}
                onChange={(e) =>
                  setForm({ ...form, note: e.target.value })
                }
              />
            </label>
            <p>
              連休の場合は、開始日から終了日までをまとめて休みとして登録します。
            </p>
          </div>
        ) : (
          <div className="field-grid details">
            <fieldset className="site-field">
              <legend>
                場所・現場情報 <em>最大5か所・履歴から選択可</em>
              </legend>
              <datalist id="site-history">
                {knownSites.map((site) => (
                  <option key={site} value={site} />
                ))}
              </datalist>
              <datalist id="location-history">
                {knownLocations.map((location) => (
                  <option key={location} value={location} />
                ))}
              </datalist>
              <datalist id="address-history">
                {knownAddresses.map((address) => (
                  <option key={address} value={address} />
                ))}
              </datalist>
              <datalist id="personnel-history">
                {knownPersonnelNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <div className="site-input-list">
                {formSites.map((site, index) => {
                  const location = formLocations[index];
                  const address = formAddresses[index];
                  const coordinates = formCoordinates[index];
                  const personnelNames = formPersonnelNames[index];
                  const siteWork = formWorks[index];
                  const start = formStarts[index];
                  const end = formEnds[index];
                  const siteNote = formNotes[index];
                  const selectedNames = splitNames(personnelNames);
                  const selectedWorks = siteWork.split("・").filter(Boolean);
                  const showGarbageDisposal = selectedWorks.some((work) =>
                    GARBAGE_DISPOSAL_TRIGGERS.includes(work),
                  );
                  const previous =
                    previousSiteVisits[
                      `${location.trim()} ${site.trim()} ${address.trim()} ${coordinates.trim()}`
                    ];
                  return (
                    <div className="site-input-row" key={index}>
                      <div className="site-pair-card">
                        <span className="site-number">{index + 1}</span>
                        <div className="site-pair-inputs">
                          <label>
                            <span>
                              場所 <em>住所は入力しない</em>
                            </span>
                            <input
                              aria-label={`場所 ${index + 1}`}
                              list="location-history"
                              placeholder="例：熊本市・阿蘇"
                              value={location}
                              onChange={(e) =>
                                updateLocation(index, e.target.value)
                              }
                            />
                          </label>
                          <label>
                            <span>
                              現場名 <em>不明なら空欄でOK</em>
                            </span>
                            <input
                              aria-label={`現場名 ${index + 1}`}
                              list="site-history"
                              placeholder="例：〇〇様邸"
                              value={site}
                              onChange={(e) =>
                                updateSite(index, e.target.value)
                              }
                            />
                          </label>
                          {needsTime && (
                            <div className="site-time-fields wide-input">
                              <label>
                                <span>この現場の開始時刻</span>
                                <input
                                  type="time"
                                  required
                                  value={start}
                                  onChange={(e) =>
                                    updateStart(index, e.target.value)
                                  }
                                />
                              </label>
                              <span className="arrow">→</span>
                              <label>
                                <span>終了時刻</span>
                                <input
                                  type="time"
                                  required
                                  value={end}
                                  onChange={(e) =>
                                    updateEnd(index, e.target.value)
                                  }
                                />
                              </label>
                            </div>
                          )}
                          <div className="current-location-action wide-input">
                            <button
                              type="button"
                              onClick={() => getCurrentAddress(index)}
                              disabled={locatingSiteIndex !== null}
                            >
                              {locatingSiteIndex === index
                                ? "現在地を取得中…"
                                : "◎ 現在地から住所を取得"}
                            </button>
                            {locationLookupMessages[index] && (
                              <small>
                                {locationLookupMessages[index]}
                              </small>
                            )}
                          </div>
                          <label className="wide-input">
                            <span>
                              位置情報{" "}
                              <em>住所または緯度・経度を入力</em>
                            </span>
                            <input
                              aria-label={`位置情報 ${index + 1}`}
                              list="address-history"
                              placeholder="例：熊本県熊本市東区〇〇1-2-3 または 32.8031, 130.7079"
                              value={positionInputValue(
                                address,
                                coordinates,
                              )}
                              onChange={(e) =>
                                updatePosition(index, e.target.value)
                              }
                            />
                          </label>
                          {(address.trim() || coordinates.trim()) && (
                            <a
                              className="map-link wide-input"
                              href={mapsUrl(
                                address,
                                coordinates,
                                location,
                                site,
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Googleマップで確認する ↗
                            </a>
                          )}
                          <label className="personnel-input">
                            <span>
                              作業者名 <em>複数の場合は「、」で区切る</em>
                            </span>
                            <input
                              aria-label={`作業者名 ${index + 1}`}
                              list="personnel-history"
                              placeholder="例：田中、佐藤"
                              value={personnelNames}
                              onChange={(e) =>
                                updatePersonnelNames(
                                  index,
                                  e.target.value,
                                )
                              }
                            />
                          </label>
                          {knownPersonnelNames.length > 0 && (
                            <div className="personnel-options">
                              <small>作業者マスターから選択</small>
                              <div>
                                {masterPersonnelNames.length > 0 && (
                                  <button
                                    type="button"
                                    className={
                                      masterPersonnelNames.every((name) =>
                                        selectedNames.includes(name),
                                      )
                                        ? "selected"
                                        : ""
                                    }
                                    onClick={() =>
                                      toggleAllPersonnel(index)
                                    }
                                  >
                                    {masterPersonnelNames.every((name) =>
                                      selectedNames.includes(name),
                                    )
                                      ? "✓ "
                                      : ""}
                                    全員
                                  </button>
                                )}
                                {knownPersonnelNames.map((name) => (
                                  <button
                                    type="button"
                                    key={name}
                                    className={
                                      selectedNames.includes(name)
                                        ? "selected"
                                        : ""
                                    }
                                    onClick={() =>
                                      togglePersonnelName(index, name)
                                    }
                                  >
                                    {selectedNames.includes(name)
                                      ? "✓ "
                                      : ""}
                                    {name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <fieldset className="site-work-field wide-input">
                            <legend>
                              この現場の作業内容 <em>複数選択可</em>
                            </legend>
                            <div className="work-options">
                              {knownWorkOptions.map((work) => {
                                const selected = siteWork
                                  .split("・")
                                  .includes(work);
                                return (
                                  <button
                                    key={work}
                                    type="button"
                                    aria-pressed={selected}
                                    className={selected ? "selected" : ""}
                                    onClick={() =>
                                      toggleWork(index, work)
                                    }
                                  >
                                    <span className="check">✓</span>
                                    {work}
                                  </button>
                                );
                              })}
                              {showGarbageDisposal && (
                                <button
                                  type="button"
                                  aria-pressed={selectedWorks.includes(
                                    GARBAGE_DISPOSAL_OPTION,
                                  )}
                                  className={
                                    selectedWorks.includes(
                                      GARBAGE_DISPOSAL_OPTION,
                                    )
                                      ? "selected conditional-work"
                                      : "conditional-work"
                                  }
                                  onClick={() =>
                                    toggleWork(
                                      index,
                                      GARBAGE_DISPOSAL_OPTION,
                                    )
                                  }
                                >
                                  <span className="check">✓</span>
                                  ゴミ処分
                                </button>
                              )}
                            </div>
                          </fieldset>
                          <label className="wide-input site-note-input">
                            <span>
                              この現場のメモ <em>任意</em>
                            </span>
                            <textarea
                              rows={2}
                              aria-label={`現場メモ ${index + 1}`}
                              placeholder="雨天、直行直帰、注意点など"
                              value={siteNote}
                              onChange={(e) =>
                                updateNote(index, e.target.value)
                              }
                            />
                          </label>
                        </div>
                      </div>
                      {formSites.length > 1 && (
                        <button
                          className="remove-site"
                          type="button"
                          onClick={() => removeSite(index)}
                          aria-label={`${index + 1}番目の場所・現場を削除`}
                        >
                          削除
                        </button>
                      )}
                      {(site.trim() ||
                        location.trim() ||
                        address.trim() ||
                        coordinates.trim()) && (
                        <small
                          className={
                            previous ? "last-visit found" : "last-visit"
                          }
                        >
                          {previous ? (
                            <>
                              前回訪問：
                              <strong>{formatDate(previous.date)}</strong>
                              （{elapsedDays(form.date, previous.date)}
                              日ぶり）
                            </>
                          ) : (
                            "この場所・現場は初回です"
                          )}
                        </small>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                className="add-site"
                type="button"
                onClick={addSite}
                disabled={formSites.length >= 5}
              >
                ＋ 現場を追加（{formSites.length}/5）
              </button>
              {needsTime && (
                <div className="daily-extra-summary">
                  <span>
                    早出{" "}
                    <strong>{formatMinutes(currentExtra.early)}</strong>
                  </span>
                  <span>
                    残業{" "}
                    <strong>
                      {formatMinutes(currentExtra.overtime)}
                    </strong>
                  </span>
                  <small>1日の最初と最後の時刻から30分単位で計算</small>
                </div>
              )}
            </fieldset>
            <fieldset className="wide trip-field">
              <legend>出張</legend>
              <div className="trip-options">
                <button
                  type="button"
                  className={!form.businessTrip ? "selected" : ""}
                  aria-pressed={!form.businessTrip}
                  onClick={() =>
                    setForm({
                      ...form,
                      businessTrip: false,
                      dinnerType: "",
                      hotelName: "",
                    })
                  }
                >
                  通常勤務
                </button>
                <button
                  type="button"
                  className={form.businessTrip ? "selected" : ""}
                  aria-pressed={form.businessTrip}
                  onClick={() => setForm({ ...form, businessTrip: true })}
                >
                  出張
                </button>
              </div>
              {form.businessTrip && (
                <div className="dinner-panel">
                  <span>
                    夜ご飯 <em>必須</em>
                  </span>
                  <div className="dinner-options">
                    <button
                      type="button"
                      className={
                        form.dinnerType === "自費" ? "selected" : ""
                      }
                      aria-pressed={form.dinnerType === "自費"}
                      onClick={() =>
                        setForm({ ...form, dinnerType: "自費" })
                      }
                    >
                      自費で
                    </button>
                    <button
                      type="button"
                      className={
                        form.dinnerType === "社長と食事" ? "selected" : ""
                      }
                      aria-pressed={form.dinnerType === "社長と食事"}
                      onClick={() =>
                        setForm({ ...form, dinnerType: "社長と食事" })
                      }
                    >
                      社長と食べに行った
                    </button>
                    <button
                      type="button"
                      className={
                        form.dinnerType === "なし" ? "selected" : ""
                      }
                      aria-pressed={form.dinnerType === "なし"}
                      onClick={() =>
                        setForm({ ...form, dinnerType: "なし" })
                      }
                    >
                      なし（最終日など）
                    </button>
                    {formIsPlanned && (
                      <button
                        type="button"
                        className={
                          form.dinnerType === "未定" ? "selected" : ""
                        }
                        aria-pressed={form.dinnerType === "未定"}
                        onClick={() =>
                          setForm({ ...form, dinnerType: "未定" })
                        }
                      >
                        未定
                      </button>
                    )}
                  </div>
                  <datalist id="hotel-history">
                    {knownHotels.map((hotel) => (
                      <option key={hotel} value={hotel} />
                    ))}
                  </datalist>
                  <label className="hotel-input">
                    <span>
                      宿泊ホテル <em>任意・過去のホテルから選択可</em>
                    </span>
                    <input
                      list="hotel-history"
                      placeholder="例：〇〇ホテル熊本"
                      value={form.hotelName}
                      onChange={(e) =>
                        setForm({ ...form, hotelName: e.target.value })
                      }
                    />
                  </label>
                </div>
              )}
            </fieldset>
          </div>
        )}
        {error && <p className="error-message">{error}</p>}
        <button
          className={`primary record-submit ${formIsPlanned ? "planned-submit" : ""}`}
          type="submit"
          disabled={saving}
        >
          {saving
            ? "保存しています…"
            : form.type === "休み"
              ? `✓ ${form.date === offEndDate ? "この日を" : "この期間を"}休みとして登録する`
              : editingId
                ? formIsPlanned
                  ? "✓ 予定の変更を保存する"
                  : "✓ 変更を保存する"
                : formIsPlanned
                  ? "✓ この内容で予定を登録する"
                  : "✓ この内容で記録する"}
        </button>
      </form>
    </section>
  );
}

import type { ReactNode } from "react";
import type { Entry } from "@/app/types";

type ShiftBoardTabProps = {
  shiftBoardEntries: Entry[];
  shiftBoardDone: string[];
  shiftBoardFingerprint: (entry: Entry) => string;
  shiftBoardGroups: {
    normal: Entry[];
    exceptions: Entry[];
    daysOff: Entry[];
  };
  toggleShiftBoardDone: (entry: Entry) => void;
  formatDate: (value: string) => string;
  pendingShiftBoardEntries: Entry[];
  clearShiftBoardDone: () => void;
  shiftBoardRow: (entry: Entry, done: boolean) => ReactNode;
  completedShiftBoardEntries: Entry[];
  shiftBoardRange: (entry: Entry) => { start: string; end: string };
};

export default function ShiftBoardTab({
  shiftBoardEntries,
  shiftBoardDone,
  shiftBoardFingerprint,
  shiftBoardGroups,
  toggleShiftBoardDone,
  formatDate,
  pendingShiftBoardEntries,
  clearShiftBoardDone,
  shiftBoardRow,
  completedShiftBoardEntries,
  shiftBoardRange,
}: ShiftBoardTabProps) {
  return (
    <details className="shiftboard-section collapsible-section" open>
      <summary className="section-toggle">
        <div>
          <span className="eyebrow">SHIFTBOARD TRANSFER</span>
          <h2>シフトボード転記</h2>
        </div>
        <span className="transfer-progress">
          {
            shiftBoardEntries.filter((entry) =>
              shiftBoardDone.includes(shiftBoardFingerprint(entry)),
            ).length
          }
          /{shiftBoardEntries.length}件
        </span>
      </summary>
      <div className="collapsible-content">
        <p className="transfer-guide">
          シフトボードの「履歴から追加」で通常勤務の日を続けて登録し、時間が違う日と休みだけ個別に入力すると早く終わります。
        </p>
        {!shiftBoardEntries.length ? (
          <div className="transfer-empty">
            この月の勤務記録はありません
          </div>
        ) : (
          <>
            <div className="transfer-groups">
              <article>
                <div>
                  <span className="transfer-label normal">通常</span>
                  <strong>08:00〜17:00</strong>
                  <small>{shiftBoardGroups.normal.length}日</small>
                </div>
                <div className="transfer-date-column">
                  {shiftBoardGroups.normal.length ? (
                    shiftBoardGroups.normal.map((entry) => {
                      const done = shiftBoardDone.includes(
                        shiftBoardFingerprint(entry),
                      );
                      return (
                        <label
                          className={done ? "done" : ""}
                          key={entry.id}
                        >
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={() => toggleShiftBoardDone(entry)}
                          />
                          <b>{formatDate(entry.date)}</b>
                        </label>
                      );
                    })
                  ) : (
                    <span className="none">該当なし</span>
                  )}
                </div>
              </article>
              <article>
                <div>
                  <span className="transfer-label exception">例外</span>
                  <strong>時間が違う勤務</strong>
                  <small>{shiftBoardGroups.exceptions.length}日</small>
                </div>
                <div className="transfer-date-column">
                  {shiftBoardGroups.exceptions.length ? (
                    shiftBoardGroups.exceptions.map((entry) => {
                      const range = shiftBoardRange(entry);
                      const done = shiftBoardDone.includes(
                        shiftBoardFingerprint(entry),
                      );
                      return (
                        <label
                          className={done ? "done" : ""}
                          key={entry.id}
                        >
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={() => toggleShiftBoardDone(entry)}
                          />
                          <b>{formatDate(entry.date)}</b>
                          <em>
                            {range.start}〜{range.end}
                          </em>
                        </label>
                      );
                    })
                  ) : (
                    <span className="none">該当なし</span>
                  )}
                </div>
              </article>
              <article>
                <div>
                  <span className="transfer-label off">休み</span>
                  <strong>休みとして入力</strong>
                  <small>{shiftBoardGroups.daysOff.length}日</small>
                </div>
                <div className="transfer-date-column">
                  {shiftBoardGroups.daysOff.length ? (
                    shiftBoardGroups.daysOff.map((entry) => {
                      const done = shiftBoardDone.includes(
                        shiftBoardFingerprint(entry),
                      );
                      return (
                        <label
                          className={done ? "done" : ""}
                          key={entry.id}
                        >
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={() => toggleShiftBoardDone(entry)}
                          />
                          <b>{formatDate(entry.date)}</b>
                        </label>
                      );
                    })
                  ) : (
                    <span className="none">該当なし</span>
                  )}
                </div>
              </article>
            </div>
            <div className="transfer-list-heading">
              <strong>
                未入力 <span>{pendingShiftBoardEntries.length}件</span>
              </strong>
              <button type="button" onClick={clearShiftBoardDone}>
                この月をリセット
              </button>
            </div>
            {pendingShiftBoardEntries.length ? (
              <div className="transfer-list">
                {pendingShiftBoardEntries.map((entry) =>
                  shiftBoardRow(entry, false),
                )}
              </div>
            ) : (
              <div className="transfer-complete-message">
                ✓ この月の入力はすべて完了しています
              </div>
            )}
            {completedShiftBoardEntries.length > 0 && (
              <details className="completed-transfer-list">
                <summary>
                  <strong>入力済み</strong>
                  <span>{completedShiftBoardEntries.length}件</span>
                </summary>
                <div className="transfer-list">
                  {completedShiftBoardEntries.map((entry) =>
                    shiftBoardRow(entry, true),
                  )}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </details>
  );
}

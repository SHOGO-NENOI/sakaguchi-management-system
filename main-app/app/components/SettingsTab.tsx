import type { Dispatch, SetStateAction } from "react";
import { formatDate } from "@/app/lib/entry-helpers";
import type {
  FontSize,
  GoogleConnection,
  MasterOption,
  SiteMaster,
  Skin,
  SyncDashboard,
} from "@/app/types";

type SettingsTabProps = {
  // Googleアカウント連携
  googleConnection: GoogleConnection;
  googleSyncing: boolean;
  syncExistingEntries: () => void;
  spreadsheetUrl: string;
  disconnectGoogleAccount: () => void;
  googleClientId: string;
  setGoogleClientId: (value: string) => void;
  googleClientSecret: string;
  setGoogleClientSecret: (value: string) => void;
  saveGoogleConnectionSettings: () => void;
  googleConnectionMessage: string;
  // Google双方向同期
  syncDashboard: SyncDashboard | null;
  reconcileGoogle: (showMessage?: boolean) => void;
  retrySync: (ids: number[]) => void;
  selectedDuplicateIds: string[];
  setSelectedDuplicateIds: Dispatch<SetStateAction<string[]>>;
  cleanupDuplicates: () => void;
  restoreTrash: (ids: number[]) => void;
  syncManagerMessage: string;
  // 画面のスキン・文字サイズ
  skin: Skin;
  setSkin: (value: Skin) => void;
  fontSize: FontSize;
  setFontSize: (value: FontSize) => void;
  // アプリ情報
  appVersion: string;
  appUpdatedAt: string;
  // 通知設定
  notificationStatus: "default" | "granted" | "denied" | "unsupported";
  enableNotifications: () => void;
  // 入力候補の管理
  fixedWorkOrder: string[];
  moveFixedWork: (name: string, direction: -1 | 1) => void;
  masterDrafts: Record<"work" | "person", string>;
  setMasterDrafts: (
    updater: (
      current: Record<"work" | "person", string>,
    ) => Record<"work" | "person", string>,
  ) => void;
  saveMasterOption: (type: "work" | "person", option?: MasterOption) => void;
  masterOptions: Record<"work" | "person", MasterOption[]>;
  FIXED_WORK_OPTIONS: string[];
  toggleMasterArchive: (
    type: "work" | "person",
    option: MasterOption,
  ) => void;
  siteMasters: SiteMaster[];
  restoreSite: (master: SiteMaster) => void;
  masterMessage: string;
};

export default function SettingsTab({
  googleConnection,
  googleSyncing,
  syncExistingEntries,
  spreadsheetUrl,
  disconnectGoogleAccount,
  googleClientId,
  setGoogleClientId,
  googleClientSecret,
  setGoogleClientSecret,
  saveGoogleConnectionSettings,
  googleConnectionMessage,
  syncDashboard,
  reconcileGoogle,
  retrySync,
  selectedDuplicateIds,
  setSelectedDuplicateIds,
  cleanupDuplicates,
  restoreTrash,
  syncManagerMessage,
  skin,
  setSkin,
  fontSize,
  setFontSize,
  appVersion,
  appUpdatedAt,
  notificationStatus,
  enableNotifications,
  fixedWorkOrder,
  moveFixedWork,
  masterDrafts,
  setMasterDrafts,
  saveMasterOption,
  masterOptions,
  FIXED_WORK_OPTIONS,
  toggleMasterArchive,
  siteMasters,
  restoreSite,
  masterMessage,
}: SettingsTabProps) {
  return (
    <>
      <section className="google-oauth-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOGLE ACCOUNT</span>
            <h2>Googleアカウント連携</h2>
            <p>
              Apps
              Scriptを使わず、カレンダー・スプレッドシート・ドライブへ接続します。
            </p>
          </div>
          <span
            className={`google-status ${googleConnection.connected ? "connected" : ""}`}
          >
            {googleConnection.connected
              ? "連携済み"
              : googleConnection.configured
                ? "接続待ち"
                : "未設定"}
          </span>
        </div>
        {googleConnection.connected ? (
          <div className="google-connected-panel">
            <div>
              <strong>{googleConnection.name || "Googleアカウント"}</strong>
              <span>{googleConnection.email}</span>
              <small>
                勤務記録はカレンダーとスプレッドシートへ、現場資料はGoogleドライブへ保存されます。
              </small>
            </div>
            <div className="google-connected-actions">
              <a href="/api/google/start">Googleアカウントを再連携</a>
              <button
                className="primary"
                type="button"
                disabled={googleSyncing}
                onClick={syncExistingEntries}
              >
                {googleSyncing ? "反映中…" : "過去の記録を全件反映"}
              </button>
              {(spreadsheetUrl || googleConnection.spreadsheetUrl) && (
                <a
                  href={spreadsheetUrl || googleConnection.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  スプレッドシートを開く
                </a>
              )}
              <button type="button" onClick={disconnectGoogleAccount}>
                連携を解除
              </button>
            </div>
          </div>
        ) : (
          <div className="google-credential-form">
            <label>
              <span>クライアントID</span>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="〜.apps.googleusercontent.com"
                value={googleClientId}
                onChange={(event) => setGoogleClientId(event.target.value)}
              />
            </label>
            <label>
              <span>クライアントシークレット</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder={
                  googleConnection.configured
                    ? "変更するときだけ入力"
                    : "Google Cloudで発行された値"
                }
                value={googleClientSecret}
                onChange={(event) =>
                  setGoogleClientSecret(event.target.value)
                }
              />
            </label>
            <p className="google-secret-note">
              シークレットは暗号化して保存し、保存後は画面に表示しません。
            </p>
            <div className="google-oauth-actions">
              <button
                className="primary"
                type="button"
                onClick={saveGoogleConnectionSettings}
              >
                IDとシークレットを保存
              </button>
              {googleConnection.configured && (
                <a href="/api/google/start">Googleアカウントを連携</a>
              )}
            </div>
          </div>
        )}
        {googleConnectionMessage && (
          <p className="calendar-message">{googleConnectionMessage}</p>
        )}
      </section>
      {googleConnection.connected && (
        <section className="sync-manager-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">GOOGLE TWO-WAY SYNC</span>
              <h2>Google同期管理</h2>
              <p>
                勤務記録・予定とGoogleカレンダーの登録、変更、削除を双方向で合わせます。
              </p>
            </div>
            <span className="sync-live">● 双方向同期オン</span>
          </div>
          {!syncDashboard ? (
            <p className="sync-loading">同期状態を確認しています…</p>
          ) : (
            <>
              <div className="sync-stat-grid">
                <article>
                  <small>同期済み</small>
                  <strong>{syncDashboard.synced}件</strong>
                </article>
                <article>
                  <small>未同期</small>
                  <strong>{syncDashboard.pending}件</strong>
                </article>
                <article
                  className={syncDashboard.errors.length ? "warning" : ""}
                >
                  <small>エラー</small>
                  <strong>{syncDashboard.errors.length}件</strong>
                </article>
                <article
                  className={syncDashboard.duplicates.length ? "warning" : ""}
                >
                  <small>重複候補</small>
                  <strong>
                    {syncDashboard.duplicates.reduce(
                      (sum, group) => sum + group.duplicateEventIds.length,
                      0,
                    )}
                    件
                  </strong>
                </article>
              </div>
              <div className="sync-manager-actions">
                <button
                  className="primary"
                  type="button"
                  disabled={googleSyncing}
                  onClick={() => reconcileGoogle(true)}
                >
                  {googleSyncing ? "照合中…" : "Googleと整合性を確認"}
                </button>
                {syncDashboard.errors.length > 0 && (
                  <button
                    type="button"
                    disabled={googleSyncing}
                    onClick={() =>
                      retrySync(syncDashboard.errors.map((item) => item.id))
                    }
                  >
                    エラーだけ再実行
                  </button>
                )}
                <small>
                  最終同期：
                  {syncDashboard.lastSyncAt
                    ? new Date(syncDashboard.lastSyncAt).toLocaleString(
                        "ja-JP",
                      )
                    : "未実行"}
                </small>
              </div>
              {syncDashboard.errors.length > 0 && (
                <details className="sync-detail" open>
                  <summary>
                    同期エラー <span>{syncDashboard.errors.length}件</span>
                  </summary>
                  <div>
                    {syncDashboard.errors.map((item) => (
                      <article key={item.id}>
                        <div>
                          <strong>
                            {formatDate(item.date)}
                            {item.site || "現場未入力"}
                          </strong>
                          <small>{item.error}</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => retrySync([item.id])}
                        >
                          再実行
                        </button>
                      </article>
                    ))}
                  </div>
                </details>
              )}
              {syncDashboard.duplicates.length > 0 && (
                <details className="sync-detail" open>
                  <summary>
                    重複予定の整理{" "}
                    <span>{selectedDuplicateIds.length}件選択</span>
                  </summary>
                  <div>
                    {syncDashboard.duplicates.map((group) =>
                      group.duplicateEventIds.map((eventId) => (
                        <label className="duplicate-row" key={eventId}>
                          <input
                            type="checkbox"
                            checked={selectedDuplicateIds.includes(eventId)}
                            onChange={(event) =>
                              setSelectedDuplicateIds((current) =>
                                event.target.checked
                                  ? [...current, eventId]
                                  : current.filter((id) => id !== eventId),
                              )
                            }
                          />
                          <span>
                            <strong>{group.summary}</strong>
                            <small>
                              {new Date(group.start).toLocaleString("ja-JP")}
                            </small>
                          </span>
                        </label>
                      )),
                    )}
                  </div>
                  <button
                    className="duplicate-cleanup"
                    type="button"
                    disabled={!selectedDuplicateIds.length || googleSyncing}
                    onClick={cleanupDuplicates}
                  >
                    選択した重複予定を削除
                  </button>
                </details>
              )}
              <details className="sync-detail">
                <summary>
                  ごみ箱 <span>{syncDashboard.trash.length}件</span>
                </summary>
                <div>
                  {syncDashboard.trash.length ? (
                    syncDashboard.trash.map((item) => (
                      <article key={item.id}>
                        <div>
                          <strong>
                            {formatDate(item.date)}
                            {item.site || "現場未入力"}
                          </strong>
                          <small>アプリ側で削除・30日間復元可能</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => restoreTrash([item.id])}
                        >
                          復元
                        </button>
                      </article>
                    ))
                  ) : (
                    <p>削除された記録はありません</p>
                  )}
                </div>
              </details>
            </>
          )}
          {syncManagerMessage && (
            <p className="calendar-message">{syncManagerMessage}</p>
          )}
        </section>
      )}
      <section className="settings-skin-card">
        <div>
          <span className="eyebrow">APPEARANCE</span>
          <h2>画面のスキン</h2>
        </div>
        <div className="skin-options" aria-label="画面のスキン">
          {(
            [
              ["green", "グリーン"],
              ["black", "ブラック"],
              ["blue", "ブルー"],
              ["purple", "パープル"],
              ["brown", "ブラウン"],
              ["white", "ホワイト"],
            ] as [Skin, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${value} ${skin === value ? "active" : ""}`}
              aria-pressed={skin === value}
              onClick={() => setSkin(value)}
            >
              <span />
              {label}
              {skin === value && <b>選択中</b>}
            </button>
          ))}
        </div>
        <div className="font-size-settings">
          <div>
            <strong>文字サイズ</strong>
            <small>アプリ全体の文字サイズを変更できます</small>
          </div>
          <div className="font-size-options" aria-label="文字サイズ">
            {([
              ["small", "小さめ"],
              ["standard", "標準"],
              ["large", "大きめ"],
              ["extra-large", "特大"],
              ["maximum", "最大"],
            ] as [FontSize, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={fontSize === value ? "active" : ""}
                aria-pressed={fontSize === value}
                onClick={() => setFontSize(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="app-info-card">
        <div>
          <span className="eyebrow">APP INFORMATION</span>
          <h2>アプリ情報</h2>
        </div>
        <dl>
          <div>
            <dt>バージョン</dt>
            <dd>v{appVersion}</dd>
          </div>
          <div>
            <dt>更新日</dt>
            <dd>{appUpdatedAt}</dd>
          </div>
        </dl>
      </section>
      <details className="reminder-section collapsible-section" open>
        <summary className="section-toggle">
          <div>
            <span className="eyebrow">REMINDER</span>
            <h2>通知設定</h2>
          </div>
          <span className="reminder-status">
            {notificationStatus === "granted" ? "オン" : "設定"}
          </span>
        </summary>
        <div className="reminder-content">
          <div>
            <p>・毎日21時以降、当日の勤務記録がない場合</p>
            <p>
              ・月末日の前日21時以降、シフトボードへの入力時期になった場合
            </p>
            <p className="reminder-note">
              アプリを開いている時、またはその後に次回開いた時に、この端末へ1回だけお知らせします。
            </p>
          </div>
          <button
            type="button"
            className={notificationStatus === "granted" ? "enabled" : ""}
            onClick={enableNotifications}
            disabled={
              notificationStatus === "granted" ||
              notificationStatus === "denied" ||
              notificationStatus === "unsupported"
            }
          >
            {notificationStatus === "granted"
              ? "通知オン"
              : notificationStatus === "denied"
                ? "通知が拒否されています"
                : notificationStatus === "unsupported"
                  ? "この端末は非対応"
                  : "通知をオンにする"}
          </button>
        </div>
      </details>
      <section className="master-management-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MASTER MANAGEMENT</span>
            <h2>入力候補の管理</h2>
            <p>基本作業は固定表示し、珍しい作業だけ追加できます。</p>
          </div>
        </div>
        <div className="master-columns">
          {(
            [
              ["work", "作業内容マスター"],
              ["person", "作業者名マスター"],
            ] as ["work" | "person", string][]
          ).map(([type, title]) => (
            <article key={type}>
              <h3>{title}</h3>
              {type === "work" && (
                <div className="fixed-work-master">
                  <strong>固定項目</strong>
                  <p>削除はできません。矢印で表示順を変更できます。</p>
                  <div>
                    {fixedWorkOrder.map((name, index) => (
                      <span key={name}>
                        <b>{name}</b>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveFixedWork(name, -1)}
                          aria-label={`${name}を上へ`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === fixedWorkOrder.length - 1}
                          onClick={() => moveFixedWork(name, 1)}
                          aria-label={`${name}を下へ`}
                        >
                          ↓
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="master-add">
                <input
                  value={masterDrafts[type]}
                  placeholder={
                    type === "work"
                      ? "例：竹林整備・支柱設置"
                      : "例：山田 太郎"
                  }
                  onChange={(event) =>
                    setMasterDrafts((current) => ({
                      ...current,
                      [type]: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() => saveMasterOption(type)}
                >
                  追加
                </button>
              </div>
              <div className="master-list">
                {masterOptions[type]
                  .filter(
                    (option) =>
                      type !== "work" ||
                      !FIXED_WORK_OPTIONS.includes(option.name),
                  )
                  .map((option) => (
                    <div
                      className={option.archivedAt ? "archived" : ""}
                      key={option.id}
                    >
                      <span>{option.name}</span>
                      <div>
                        {!option.archivedAt && (
                          <button
                            type="button"
                            onClick={() => saveMasterOption(type, option)}
                          >
                            編集
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleMasterArchive(type, option)}
                        >
                          {option.archivedAt ? "復元" : "非表示"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </article>
          ))}
        </div>
        {siteMasters.some((site) => site.archivedAt) && (
          <details className="archived-sites">
            <summary>
              非表示の現場（
              {siteMasters.filter((site) => site.archivedAt).length}件）
            </summary>
            {siteMasters
              .filter((site) => site.archivedAt)
              .map((site) => (
                <div key={site.id}>
                  <span>{site.site}</span>
                  <button type="button" onClick={() => restoreSite(site)}>
                    復元
                  </button>
                </div>
              ))}
          </details>
        )}
        {masterMessage && (
          <p className="calendar-message">{masterMessage}</p>
        )}
      </section>
    </>
  );
}

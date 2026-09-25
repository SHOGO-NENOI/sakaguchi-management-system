import type { Dispatch, SetStateAction } from "react";
import { coordinateKey } from "@/app/lib/coordinates";
import {
  cardRegionInfo,
  elapsedDays,
  formatDate,
  formatFileSize,
  mapsUrl,
  navigationUrl,
  parsePositionInput,
  positionInputValue,
  siteCardKey,
  today,
} from "@/app/lib/entry-helpers";
import type { RegionInfo, SiteCardData, SiteDocument } from "@/app/types";

type SiteDraft = { site: string; location: string; address: string; coordinates: string };
type GroupedSiteCards = {
  prefecture: string;
  label: string;
  count: number;
  municipalities: [string, SiteCardData[]][];
  flat: boolean;
}[];

type SitesTabProps = {
  siteCards: SiteCardData[];
  siteCardSearch: string;
  setSiteCardSearch: (value: string) => void;
  filteredSiteCards: SiteCardData[];
  siteCardSort: "region" | "name" | "newest" | "oldest";
  setSiteCardSort: (value: "region" | "name" | "newest" | "oldest") => void;
  siteAddressFilter: "all" | "registered" | "missing";
  setSiteAddressFilter: (value: "all" | "registered" | "missing") => void;
  siteDocumentFilter: "all" | "has" | "none";
  setSiteDocumentFilter: (value: "all" | "has" | "none") => void;
  showNewSite: boolean;
  setShowNewSite: Dispatch<SetStateAction<boolean>>;
  newSiteMessage: string;
  setNewSiteMessage: (value: string) => void;
  newSiteDraft: SiteDraft;
  setNewSiteDraft: (value: SiteDraft) => void;
  useCurrentLocationForNewSite: () => void;
  createSiteMaster: () => void;
  newSiteSaving: boolean;
  siteLocationMessage: string;
  editingSiteLocationKey: string | null;
  siteNameMessage: string;
  editingSiteNameKey: string | null;
  groupedSiteCards: GroupedSiteCards;
  siteDocumentsByKey: Record<string, SiteDocument[]>;
  siteDocumentCounts: Record<string, number> | null;
  coordinateAddresses: Record<string, string>;
  coordinateRegions: Record<string, RegionInfo>;
  loadSiteDocuments: (siteKey: string, force?: boolean) => void;
  openSiteNameEditor: (card: SiteCardData) => void;
  openSiteLocationEditor: (card: SiteCardData) => void;
  siteNameDraft: string;
  setSiteNameDraft: (value: string) => void;
  saveSiteName: (card: SiteCardData) => void;
  siteNameSaving: boolean;
  siteLocationDraft: { location: string; address: string; coordinates: string };
  setSiteLocationDraft: (value: {
    location: string;
    address: string;
    coordinates: string;
  }) => void;
  useCurrentLocation: () => void;
  saveSiteLocation: (card: SiteCardData) => void;
  siteLocationSaving: boolean;
  siteDocumentUploadingKey: string | null;
  uploadSiteDocuments: (card: SiteCardData, files: FileList | null) => void;
  deleteSiteDocument: (card: SiteCardData, document: SiteDocument) => void;
  siteDocumentLoadingKey: string | null;
  siteDocumentMessages: Record<string, string>;
};

export default function SitesTab({
  siteCards,
  siteCardSearch,
  setSiteCardSearch,
  filteredSiteCards,
  siteCardSort,
  setSiteCardSort,
  siteAddressFilter,
  setSiteAddressFilter,
  siteDocumentFilter,
  setSiteDocumentFilter,
  showNewSite,
  setShowNewSite,
  newSiteMessage,
  setNewSiteMessage,
  newSiteDraft,
  setNewSiteDraft,
  useCurrentLocationForNewSite,
  createSiteMaster,
  newSiteSaving,
  siteLocationMessage,
  editingSiteLocationKey,
  siteNameMessage,
  editingSiteNameKey,
  groupedSiteCards,
  siteDocumentsByKey,
  siteDocumentCounts,
  coordinateAddresses,
  coordinateRegions,
  loadSiteDocuments,
  openSiteNameEditor,
  openSiteLocationEditor,
  siteNameDraft,
  setSiteNameDraft,
  saveSiteName,
  siteNameSaving,
  siteLocationDraft,
  setSiteLocationDraft,
  useCurrentLocation,
  saveSiteLocation,
  siteLocationSaving,
  siteDocumentUploadingKey,
  uploadSiteDocuments,
  deleteSiteDocument,
  siteDocumentLoadingKey,
  siteDocumentMessages,
}: SitesTabProps) {
  return (
    <details className="site-summary-section collapsible-section" open>
      <summary className="section-toggle">
        <div>
          <span className="eyebrow">SITE LIST</span>
          <h2>現場一覧</h2>
        </div>
        <span className="count">{siteCards.length}現場</span>
      </summary>
      <div className="collapsible-content">
        <div className="site-card-search">
          <span>⌕</span>
          <input
            type="search"
            aria-label="現場名で検索"
            placeholder="現場名を入力して検索"
            value={siteCardSearch}
            onChange={(e) => setSiteCardSearch(e.target.value)}
          />
          {siteCardSearch && (
            <button type="button" onClick={() => setSiteCardSearch("")}>
              クリア
            </button>
          )}
          <small>{filteredSiteCards.length}件</small>
        </div>
        <div className="site-list-controls">
          <label>
            <span>並べ替え</span>
            <select
              value={siteCardSort}
              onChange={(e) =>
                setSiteCardSort(e.target.value as "region" | "name" | "newest" | "oldest")
              }
            >
              <option value="region">地域順</option>
              <option value="name">あいうえお順</option>
              <option value="oldest">前回訪問日：古い順</option>
              <option value="newest">前回訪問日：新しい順</option>
            </select>
          </label>
          <label>
            <span>住所</span>
            <select
              value={siteAddressFilter}
              onChange={(e) =>
                setSiteAddressFilter(
                  e.target.value as "all" | "registered" | "missing",
                )
              }
            >
              <option value="all">すべて</option>
              <option value="registered">住所登録済み</option>
              <option value="missing">住所未登録</option>
            </select>
          </label>
          <label>
            <span>資料</span>
            <select
              value={siteDocumentFilter}
              onChange={(e) =>
                setSiteDocumentFilter(e.target.value as "all" | "has" | "none")
              }
            >
              <option value="all">すべて</option>
              <option value="has">資料あり</option>
              <option value="none">資料なし</option>
            </select>
          </label>
          {(siteCardSort !== "region" ||
            siteAddressFilter !== "all" ||
            siteDocumentFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSiteCardSort("region");
                setSiteAddressFilter("all");
                setSiteDocumentFilter("all");
              }}
            >
              リセット
            </button>
          )}
        </div>
        <div className="site-master-toolbar">
          <button
            type="button"
            onClick={() => {
              setShowNewSite((current) => !current);
              setNewSiteMessage("");
            }}
          >
            {showNewSite ? "閉じる" : "＋ 新しい現場を追加"}
          </button>
        </div>
        {showNewSite && (
          <div className="site-master-form">
            <label>
              <span>現場名</span>
              <input
                value={newSiteDraft.site}
                onChange={(e) =>
                  setNewSiteDraft({
                    ...newSiteDraft,
                    site: e.target.value,
                  })
                }
                placeholder="例：〇〇太陽光発電所"
              />
            </label>
            <label>
              <span>地域・場所</span>
              <input
                value={newSiteDraft.location}
                onChange={(e) =>
                  setNewSiteDraft({
                    ...newSiteDraft,
                    location: e.target.value,
                  })
                }
                placeholder="例：熊本市北区"
              />
            </label>
            <label className="wide">
              <span>位置情報（住所 または 緯度・経度）</span>
              <input
                value={positionInputValue(
                  newSiteDraft.address,
                  newSiteDraft.coordinates,
                )}
                onChange={(e) => {
                  const position = parsePositionInput(e.target.value);
                  setNewSiteDraft({
                    ...newSiteDraft,
                    ...position,
                  });
                }}
                placeholder="住所 または 32.803100, 130.707900"
              />
            </label>
            <div className="site-master-form-actions">
              <button
                type="button"
                onClick={useCurrentLocationForNewSite}
              >
                現在地を取得
              </button>
              <button
                className="primary"
                type="button"
                onClick={createSiteMaster}
                disabled={newSiteSaving}
              >
                {newSiteSaving ? "追加中…" : "この現場を追加"}
              </button>
            </div>
          </div>
        )}
        {newSiteMessage && (
          <p className="site-location-result">{newSiteMessage}</p>
        )}
        {siteLocationMessage && !editingSiteLocationKey && (
          <p className="site-location-result">{siteLocationMessage}</p>
        )}
        {siteNameMessage && !editingSiteNameKey && (
          <p className="site-location-result">{siteNameMessage}</p>
        )}
        {!siteCards.length ? (
          <div className="empty">
            <span>現</span>
            <h3>現場が登録されていません</h3>
            <p>「新しい現場を追加」から登録できます。</p>
          </div>
        ) : !filteredSiteCards.length ? (
          <div className="empty site-search-empty">
            <span>⌕</span>
            <h3>該当する現場がありません</h3>
            <p>現場名の一部を変えて検索してください。</p>
          </div>
        ) : (
          <div className="site-region-groups">
            {groupedSiteCards.map((prefectureGroup) => (
              <details
                className={`site-region-group ${prefectureGroup.flat ? "date-sorted-flat" : ""}`}
                key={prefectureGroup.prefecture}
                open={prefectureGroup.flat ? true : undefined}
              >
                <summary className="site-region-heading">
                  <strong>{prefectureGroup.label}</strong>
                  <span>{prefectureGroup.count}現場</span>
                </summary>
                <div className="site-municipality-groups">
                  {prefectureGroup.municipalities.map(
                    ([municipality, cards]) => (
                      <section
                        className="site-municipality-group"
                        key={`${prefectureGroup.prefecture}-${municipality}`}
                      >
                        {!prefectureGroup.flat && (
                          <header className="site-municipality-heading">
                            <strong>{municipality}</strong>
                            <span>{cards.length}件</span>
                          </header>
                        )}
                        <div className="site-card-grid">
                          {cards.map((card) => {
                            const days = card.lastDate
                              ? elapsedDays(today(), card.lastDate)
                              : null;
                            const latestNotes = [...card.notes]
                              .sort((a, b) =>
                                b.date.localeCompare(a.date),
                              )
                              .slice(0, 3);
                            const cardKey = siteCardKey(card);
                            const documents = siteDocumentsByKey[cardKey];
                            const documentCount =
                              documents?.length ??
                              (siteDocumentCounts === null
                                ? undefined
                                : (siteDocumentCounts[cardKey] ?? 0));
                            const resolvedAddress =
                              card.address ||
                              coordinateAddresses[
                                coordinateKey(card.coordinates)
                              ] ||
                              "";
                            const region = cardRegionInfo(
                              card,
                              coordinateRegions,
                            );
                            const editing =
                              editingSiteNameKey === cardKey ||
                              editingSiteLocationKey === cardKey;
                            return (
                              <article className="site-card" key={cardKey}>
                                <div className="site-card-top">
                                  <div className="site-card-identity">
                                    <h3>{card.site || "現場名不明"}</h3>
                                    <small>
                                      {region.prefecture}　{region.municipality}
                                    </small>
                                  </div>
                                  <div className="site-row-last">
                                    <small>前回訪問から</small>
                                    <strong>
                                      {days === null
                                        ? "未訪問"
                                        : days === 0
                                          ? "今日"
                                          : `${days}日経過`}
                                    </strong>
                                  </div>
                                </div>
                                <div className="site-card-button-row">
                                  {(resolvedAddress || card.coordinates) && (
                                    <a
                                      className="site-nav-link"
                                      href={navigationUrl(
                                        resolvedAddress,
                                        card.coordinates,
                                      )}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`${card.site || card.location || "現場"}まで車でナビを開く`}
                                    >
                                      🚚 ナビ
                                    </a>
                                  )}
                                  {(resolvedAddress ||
                                    card.coordinates ||
                                    card.site ||
                                    card.location) && (
                                    <a
                                      className="site-map-link"
                                      href={mapsUrl(
                                        resolvedAddress,
                                        card.coordinates,
                                        card.location,
                                        card.site,
                                      )}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`${card.site || card.location || "現場"}の地図を開く`}
                                    >
                                      🗺️ 地図
                                    </a>
                                  )}
                                  <details
                                    className="site-materials-toggle"
                                    onToggle={(event) => {
                                      if (event.currentTarget.open)
                                        void loadSiteDocuments(cardKey);
                                    }}
                                  >
                                    <summary>
                                      📎 資料
                                      {documentCount
                                        ? `（${documentCount}）`
                                        : ""}
                                    </summary>
                                    <div className="site-documents">
                                      <header>
                                        <label
                                          className={
                                            siteDocumentUploadingKey ===
                                            cardKey
                                              ? "uploading"
                                              : ""
                                          }
                                        >
                                          <input
                                            type="file"
                                            accept="image/*,.pdf,application/pdf"
                                            multiple
                                            disabled={
                                              siteDocumentUploadingKey ===
                                              cardKey
                                            }
                                            onChange={(event) => {
                                              void uploadSiteDocuments(
                                                card,
                                                event.currentTarget.files,
                                              );
                                              event.currentTarget.value =
                                                "";
                                            }}
                                          />
                                          {siteDocumentUploadingKey ===
                                          cardKey
                                            ? "保存中…"
                                            : "画像・PDFを追加"}
                                        </label>
                                      </header>
                                      {siteDocumentLoadingKey === cardKey &&
                                      !documents ? (
                                        <p className="site-document-empty">
                                          資料を読み込んでいます…
                                        </p>
                                      ) : documents?.length ? (
                                        <div className="site-document-list">
                                          {documents.map((document) => (
                                            <div
                                              className="site-document-row"
                                              key={document.id}
                                            >
                                              <a
                                                href={`/api/site-documents/file?id=${document.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                <b>
                                                  {document.contentType ===
                                                  "application/pdf"
                                                    ? "PDF"
                                                    : "画像"}
                                                </b>
                                                <span>
                                                  <strong>
                                                    {document.fileName}
                                                  </strong>
                                                  <small>
                                                    {formatFileSize(
                                                      document.size,
                                                    )}
                                                    ・
                                                    {new Intl.DateTimeFormat(
                                                      "ja-JP",
                                                      {
                                                        month: "numeric",
                                                        day: "numeric",
                                                      },
                                                    ).format(
                                                      new Date(
                                                        document.uploadedAt,
                                                      ),
                                                    )}
                                                  </small>
                                                </span>
                                              </a>
                                              <button
                                                type="button"
                                                aria-label={`${document.fileName}を削除`}
                                                onClick={() =>
                                                  deleteSiteDocument(
                                                    card,
                                                    document,
                                                  )
                                                }
                                              >
                                                削除
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="site-document-empty">
                                          除草範囲の図面や現場画像を保存できます。
                                        </p>
                                      )}
                                      {siteDocumentMessages[cardKey] && (
                                        <p className="site-document-message">
                                          {siteDocumentMessages[cardKey]}
                                        </p>
                                      )}
                                    </div>
                                  </details>
                                  <details className="site-history-toggle">
                                    <summary>📋 履歴</summary>
                                    <div className="site-card-history">
                                      {resolvedAddress && (
                                        <p className="site-address">
                                          {resolvedAddress}
                                        </p>
                                      )}
                                      {card.coordinates && (
                                        <p className="site-coordinates">
                                          {card.coordinates}
                                        </p>
                                      )}
                                      <dl className="site-stats">
                                        <div>
                                          <dt>訪問</dt>
                                          <dd>{card.visits}回</dd>
                                        </div>
                                        <div>
                                          <dt>勤務</dt>
                                          <dd>{card.workDays}日</dd>
                                        </div>
                                        <div>
                                          <dt>出張</dt>
                                          <dd>{card.tripCount}回</dd>
                                        </div>
                                      </dl>
                                      <div className="site-card-detail">
                                        <strong>作業内容</strong>
                                        <p>
                                          {[...card.works].join("・") ||
                                            "記録なし"}
                                        </p>
                                      </div>
                                      <div className="site-card-detail">
                                        <strong>一緒に行った人</strong>
                                        <p>
                                          {[...card.people].join("、") ||
                                            "記録なし"}
                                        </p>
                                      </div>
                                      <div className="site-card-detail">
                                        <strong>最近のメモ</strong>
                                        {latestNotes.length ? (
                                          <ul>
                                            {latestNotes.map((note) => (
                                              <li
                                                key={`${note.date}-${note.note}`}
                                              >
                                                <span>
                                                  {formatDate(note.date)}
                                                </span>
                                                {note.note}
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p>メモはありません</p>
                                        )}
                                      </div>
                                    </div>
                                  </details>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openSiteNameEditor(card);
                                      openSiteLocationEditor(card);
                                    }}
                                  >
                                    {editing ? "閉じる" : "編集"}
                                  </button>
                                </div>
                                {editing && (
                                <div className="site-card-expanded">
                                  {editingSiteNameKey === cardKey && (
                                    <div className="site-name-editor">
                                      <label>
                                        <span>新しい現場名</span>
                                        <input
                                          value={siteNameDraft}
                                          onChange={(e) =>
                                            setSiteNameDraft(
                                              e.target.value,
                                            )
                                          }
                                          placeholder="現場名を入力"
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => saveSiteName(card)}
                                        disabled={siteNameSaving}
                                      >
                                        {siteNameSaving
                                          ? "変更中…"
                                          : "過去の記録もまとめて変更"}
                                      </button>
                                      {siteNameMessage && (
                                        <p>{siteNameMessage}</p>
                                      )}
                                    </div>
                                  )}
                                  {editingSiteLocationKey === cardKey && (
                                    <div className="site-location-editor">
                                      <label>
                                        <span>地域・場所</span>
                                        <input
                                          placeholder="例：熊本市北区"
                                          value={
                                            siteLocationDraft.location
                                          }
                                          onChange={(e) =>
                                            setSiteLocationDraft({
                                              ...siteLocationDraft,
                                              location: e.target.value,
                                            })
                                          }
                                        />
                                      </label>
                                      <label>
                                        <span>
                                          位置情報（住所 または 緯度・経度）
                                        </span>
                                        <input
                                          placeholder="住所 または 32.803100, 130.707900"
                                          value={positionInputValue(
                                            siteLocationDraft.address,
                                            siteLocationDraft.coordinates,
                                          )}
                                          onChange={(e) => {
                                            const position =
                                              parsePositionInput(
                                                e.target.value,
                                              );
                                            setSiteLocationDraft({
                                              ...siteLocationDraft,
                                              ...position,
                                            });
                                          }}
                                        />
                                      </label>
                                      <div className="site-location-buttons">
                                        <button
                                          type="button"
                                          onClick={useCurrentLocation}
                                          disabled={siteLocationSaving}
                                        >
                                          現在地を取得
                                        </button>
                                        <button
                                          className="save-location"
                                          type="button"
                                          onClick={() =>
                                            saveSiteLocation(card)
                                          }
                                          disabled={siteLocationSaving}
                                        >
                                          {siteLocationSaving
                                            ? "保存中…"
                                            : "現場情報を保存"}
                                        </button>
                                      </div>
                                      {siteLocationMessage && (
                                        <p>{siteLocationMessage}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ),
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

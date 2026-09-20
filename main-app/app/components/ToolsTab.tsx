import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  ToolCategory,
  ToolChecklistItem,
  ToolChecklistSet,
} from "@/app/types";

type ToolsTabProps = {
  checkedToolCount: number;
  visibleToolItems: ToolChecklistItem[];
  toolCategory: ToolCategory;
  setToolCategory: (value: ToolCategory) => void;
  visibleToolSets: ToolChecklistSet[];
  toolsReady: boolean;
  loadTools: () => void;
  toolDraggingKey: string | null;
  beginToolDrag: (
    event: ReactPointerEvent<HTMLButtonElement>,
    type: "set" | "item",
    setId: number,
    id: number,
  ) => void;
  moveToolDrag: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  finishToolDrag: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  editTool: (type: "set" | "item", id: number, currentName: string) => void;
  deleteTool: (type: "set" | "item", id: number, name: string) => void;
  toggleTool: (item: ToolChecklistItem) => void;
  newToolNames: Record<number, string>;
  setNewToolNames: (
    updater: (current: Record<number, string>) => Record<number, string>,
  ) => void;
  addToolItem: (setId: number) => void;
  newToolSetName: string;
  setNewToolSetName: (value: string) => void;
  addToolSet: () => void;
  resetToolChecks: () => void;
  toolMessage: string;
};

export default function ToolsTab({
  checkedToolCount,
  visibleToolItems,
  toolCategory,
  setToolCategory,
  visibleToolSets,
  toolsReady,
  loadTools,
  toolDraggingKey,
  beginToolDrag,
  moveToolDrag,
  finishToolDrag,
  editTool,
  deleteTool,
  toggleTool,
  newToolNames,
  setNewToolNames,
  addToolItem,
  newToolSetName,
  setNewToolSetName,
  addToolSet,
  resetToolChecks,
  toolMessage,
}: ToolsTabProps) {
  return (
    <section className="tools-section">
      <div className="tools-heading">
        <div>
          <span className="eyebrow">TOOL CHECKLIST</span>
          <h2>道具チェック表</h2>
          <p>現在の準備状況</p>
        </div>
        <div className="tools-progress">
          <strong>
            {checkedToolCount}/{visibleToolItems.length}
          </strong>
          <small>チェック済み</small>
        </div>
      </div>
      <div className="tool-category-tabs" aria-label="業務区分">
        <button
          type="button"
          className={toolCategory === "通常業務" ? "active" : ""}
          onClick={() => setToolCategory("通常業務")}
        >
          通常業務
        </button>
        <button
          type="button"
          className={toolCategory === "出張" ? "active" : ""}
          onClick={() => setToolCategory("出張")}
        >
          出張
        </button>
      </div>
      <div
        className="tool-progress-bar"
        aria-label={`${visibleToolItems.length}件中${checkedToolCount}件完了`}
      >
        <span
          style={{
            width: `${visibleToolItems.length ? (checkedToolCount / visibleToolItems.length) * 100 : 0}%`,
          }}
        />
      </div>
      <p className="tool-drag-hint">
        チェックは日をまたいでも保持されます。使用後は手動でリセットしてください。
        <br />スマホでは「≡」を長押しして上下に移動できます
      </p>
      {!toolsReady ? (
        <button className="tools-load" type="button" onClick={loadTools}>
          道具一覧を読み込む
        </button>
      ) : visibleToolSets.length ? (
        <div className="tool-set-grid">
          {visibleToolSets.map((set) => {
            const completed = set.items.filter(
              (item) => item.checked,
            ).length;
            return (
              <article
                className={`tool-set-card ${toolDraggingKey === `set:${set.id}` ? "dragging" : ""}`}
                key={set.id}
              >
                <header>
                  <div>
                    <button
                      className="tool-drag-handle tool-set-drag-handle"
                      type="button"
                      aria-label={`${set.name}を長押しして並び替え`}
                      onPointerDown={(event) =>
                        beginToolDrag(event, "set", set.id, set.id)
                      }
                      onPointerMove={moveToolDrag}
                      onPointerUp={finishToolDrag}
                      onPointerCancel={finishToolDrag}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      ≡
                    </button>
                    <h3>{set.name}</h3>
                    <span>
                      {completed}/{set.items.length}
                    </span>
                  </div>
                  <div className="tool-header-actions">
                    <button
                      type="button"
                      onClick={() => editTool("set", set.id, set.name)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      aria-label={`${set.name}を削除`}
                      onClick={() => deleteTool("set", set.id, set.name)}
                    >
                      削除
                    </button>
                  </div>
                </header>
                <div className="tool-item-list">
                  {set.items.map((item) => (
                    <div
                      className={`tool-item ${item.checked ? "checked" : ""} ${toolDraggingKey === `item:${item.id}` ? "dragging" : ""}`}
                      key={item.id}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleTool(item)}
                        />
                        <span>{item.name}</span>
                      </label>
                      <div className="tool-item-actions">
                        <button
                          className="tool-edit-item"
                          type="button"
                          onClick={() =>
                            editTool("item", item.id, item.name)
                          }
                        >
                          編集
                        </button>
                        <button
                          className="tool-drag-handle"
                          type="button"
                          aria-label={`${item.name}を長押しして並び替え`}
                          onPointerDown={(event) =>
                            beginToolDrag(event, "item", set.id, item.id)
                          }
                          onPointerMove={moveToolDrag}
                          onPointerUp={finishToolDrag}
                          onPointerCancel={finishToolDrag}
                          onContextMenu={(event) =>
                            event.preventDefault()
                          }
                        >
                          ≡
                        </button>
                        <button
                          className="tool-delete-item"
                          type="button"
                          aria-label={`${item.name}を削除`}
                          onClick={() =>
                            deleteTool("item", item.id, item.name)
                          }
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="tool-add-item">
                  <input
                    value={newToolNames[set.id] ?? ""}
                    onChange={(event) =>
                      setNewToolNames((current) => ({
                        ...current,
                        [set.id]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addToolItem(set.id);
                      }
                    }}
                    placeholder="道具名を追加"
                  />
                  <button
                    type="button"
                    onClick={() => addToolItem(set.id)}
                  >
                    追加
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <span>具</span>
          <h3>{toolCategory}のセットがありません</h3>
          <p>下の欄からセットを追加できます。</p>
        </div>
      )}
      <div className="tool-add-set">
        <input
          value={newToolSetName}
          onChange={(event) => setNewToolSetName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addToolSet();
            }
          }}
          placeholder={`${toolCategory}の新しいセット名`}
        />
        <button type="button" onClick={addToolSet}>
          セットを追加
        </button>
      </div>
      <div className="tools-footer">
        <button type="button" onClick={resetToolChecks}>
          チェックを手動でリセット
        </button>
        {toolMessage && <p>{toolMessage}</p>}
      </div>
    </section>
  );
}

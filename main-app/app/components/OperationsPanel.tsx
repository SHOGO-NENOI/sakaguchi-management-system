import { useEffect, useState } from "react";

type Backup = { id?: string; name?: string; createdTime?: string; size?: string; webViewLink?: string };
type Trash = { kind: string; id: number; name: string; archivedAt: string };
type Audit = { id: number; actorName: string; action: string; targetType: string; targetId: number | null; targetName: string; createdAt: string };

const kindLabels: Record<string, string> = {
  entry: "勤務記録・予定",
  site: "現場",
  master: "入力候補",
  toolSet: "道具セット",
  toolItem: "道具",
  document: "現場資料",
};

const actionLabels: Record<string, string> = {
  create: "追加",
  update: "更新",
  archive: "削除",
  restore: "復元",
  purge: "完全削除",
  backup: "バックアップ",
};

export default function OperationsPanel() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [trash, setTrash] = useState<Trash[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [backupResponse, trashResponse, auditResponse] = await Promise.all([
        fetch("/api/backups"),
        fetch("/api/trash"),
        fetch("/api/audit-logs"),
      ]);
      const [backupData, trashData, auditData] = await Promise.all([
        backupResponse.json(),
        trashResponse.json(),
        auditResponse.json(),
      ]) as [{ backups?: Backup[]; error?: string }, { items?: Trash[]; error?: string }, { logs?: Audit[]; error?: string }];
      if (!trashResponse.ok) throw new Error(trashData.error || "削除データを確認できませんでした");
      if (!auditResponse.ok) throw new Error(auditData.error || "操作履歴を確認できませんでした");
      setTrash(trashData.items ?? []);
      setAudits(auditData.logs ?? []);
      if (backupResponse.ok) setBackups(backupData.backups ?? []);
      else setMessage(backupData.error || "Google連携後にバックアップを利用できます");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "運用情報を読み込めませんでした");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const createBackup = async () => {
    setBusy(true);
    setMessage("バックアップを作成しています…");
    try {
      const response = await fetch("/api/backups", { method: "POST" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "バックアップを作成できませんでした");
      setMessage("Google Driveへバックアップを保存しました");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "バックアップを作成できませんでした");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (item: Trash) => {
    setBusy(true);
    setMessage(`「${item.name}」を復元しています…`);
    try {
      const response = await fetch("/api/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: item.kind, id: item.id }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "復元できませんでした");
      setMessage(`「${item.name}」を復元しました`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "復元できませんでした");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="operations-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DATA SAFETY</span>
          <h2>バックアップ・復元・操作履歴</h2>
        </div>
      </div>
      <article className="backup-operation-card">
        <div>
          <strong>自動バックアップ</strong>
          <small>毎日午前3時ごろ、Google Driveへ保存します。</small>
        </div>
        <button type="button" onClick={createBackup} disabled={busy}>今すぐ作成</button>
        {backups[0] ? (
          <p>
            最新：{backups[0].createdTime ? new Date(backups[0].createdTime).toLocaleString("ja-JP") : backups[0].name}
            {backups[0].webViewLink && <> · <a href={backups[0].webViewLink} target="_blank" rel="noreferrer">Driveで開く</a></>}
          </p>
        ) : <p>バックアップはまだありません。</p>}
      </article>
      <details className="operations-detail">
        <summary>削除データの復元 <span>{trash.length}件</span></summary>
        <div className="operations-list">
          {trash.map((item) => (
            <div key={`${item.kind}-${item.id}`}>
              <span><small>{kindLabels[item.kind] ?? item.kind}</small><strong>{item.name}</strong></span>
              <button type="button" onClick={() => restore(item)} disabled={busy}>復元</button>
            </div>
          ))}
          {!trash.length && <p>復元できるデータはありません。</p>}
        </div>
      </details>
      <details className="operations-detail">
        <summary>操作履歴 <span>{audits.length}件</span></summary>
        <div className="audit-list">
          {audits.map((item) => (
            <div key={item.id}>
              <span><strong>{actionLabels[item.action] ?? item.action}：{item.targetName || item.targetType}</strong><small>{item.actorName} · {new Date(item.createdAt).toLocaleString("ja-JP")}</small></span>
            </div>
          ))}
          {!audits.length && <p>操作履歴はまだありません。</p>}
        </div>
      </details>
      {message && <p className="calendar-message">{message}</p>}
    </section>
  );
}

# 坂口商会総合管理システム v2.4.0

別チャットで開発を再開するためのソースコード一式です。

## 収録内容

- `main-app/`：坂口商会総合管理システム本体
- 画面、API、データベース定義、Drizzle移行ファイル、公開設定、画像、テスト、ビルド用スクリプト

## 除外したもの

- `.git/`
- `node_modules/`
- `dist/` などの再生成可能なビルド成果物
- `.wrangler/`
- `.env` と秘密情報
- 本番データベースおよびアップロード済みファイルの実データ

## 必要な実行環境（Mac・Windows共通）

- Node.js 22.13.0以上（Node.js 22系を推奨）
- npm
- Git
- Sitesでの公開時はD1バインディング `DB` とR2バインディング `BUCKET`
- 環境変数 `GOOGLE_OAUTH_ENCRYPTION_KEY`

`GOOGLE_OAUTH_ENCRYPTION_KEY` は、32バイトのランダム値をBase64化した文字列を設定します。実際の値はこのZIPに含まれていません。

Google OAuthのクライアントIDとクライアントシークレットはソースには含まれません。アプリの設定画面から登録し、D1へ暗号化保存する構成です。

## 初回セットアップ

Macでは「ターミナル」、Windowsでは「PowerShell」または「Windows Terminal」を使用します。WSLやGit Bashは必須ではありません。

```bash
git clone https://github.com/SHOGO-NENOI/sakaguchi-management-system.git
cd sakaguchi-management-system/main-app
npm ci
npm test
npm run dev
```

`npm run dev`に表示されたURLをブラウザーで開きます。終了は `Ctrl+C` です。

## MacとWindowsを切り替える手順

作業を始める前に、必ずGitHubの最新版を取得します。

```bash
git pull --ff-only
```

修正後はテストしてGitHubへ保存します。

```bash
npm test
git add -A
git commit -m "変更内容を短く記載"
git push
```

`git push`が完了してから、もう一方のPCで `git pull --ff-only` を実行してください。同じファイルを両方のPCで同時に修正すると競合するため、PCを切り替える前に必ず保存・同期します。

## 開発の再開

`main-app`フォルダで実行します。

```bash
npm ci
npm run build
```

ローカル開発は次のコマンドです。

```bash
npm run dev
```

### macOSでの初回セットアップ

- Apple Siliconを含むmacOSに対応しています。
- Node.js `22.13.0`以上とnpmを使用します。
- 依存関係は必ず`main-app`で`npm ci`を実行し、`package-lock.json`どおりに導入してください。
- `npm run build`は、公開環境のLinuxではGNU `timeout`で実行時間を制限し、macOSでは`gtimeout`があれば同様に制限します。どちらも無い場合でもローカルビルドは実行できます。
- `.env*`、`.sites-runtime/`、`node_modules/`、`dist/`はGit管理外です。秘密情報をコミットしないでください。

移行後の一括確認は、`main-app`で次を実行します。

```bash
npm ci
npm test
npm run lint
npm run typecheck
```

### Windowsでの初回セットアップ

- Node.js 22系（64-bit）とGit for Windowsをインストールします。
- PowerShell、コマンドプロンプト、Windows Terminalのいずれでも同じnpmコマンドを使用できます。
- プロジェクトはOneDrive配下を避け、通常のローカルフォルダーに置くとファイル監視が安定します。
- Windowsでも `npm ci`、`npm run dev`、`npm test`、`npm run lint`、`npm run typecheck` をそのまま実行できます。
- Windows固有の生成ファイルや改行差分がGitに混ざらないよう、`.gitattributes`で改行を統一しています。
- Windowsでは`main-app/scripts/*.sh`の実行権限（755）が変更されたと誤検知され、`git status`に無関係な差分が出ることがあります。その場合はリポジトリ直下で次を実行してください（このPC限定の設定で、コミットや他の環境には影響しません）。

  ```bash
  git config core.filemode false
  ```

Windowsでの一括確認も `main-app` で次を実行します。

```powershell
npm ci
npm test
npm run lint
npm run typecheck
```

## アプリ固有の注意点

- `.openai/hosting.json` には既存Sitesプロジェクトとの関連付けが含まれています。別プロジェクトとして複製する場合は、既存の `project_id` をそのまま流用せず、新しいSitesプロジェクトのIDに置き換えてください。
- `.env*`、Googleクライアントシークレット、`GOOGLE_OAUTH_ENCRYPTION_KEY`、本番データをGitHubへ保存しないでください。PCごとの秘密情報は各端末で安全に設定します。

## 変更履歴

最新の変更内容は`main-app/V2.4.0_CHANGES.md`を参照してください。

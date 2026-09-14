# 坂口商会総合管理システム v2.2.25

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

## 必要な実行環境

- Node.js 22.13.0以上
- npm
- Sitesでの公開時はD1バインディング `DB` とR2バインディング `BUCKET`
- 環境変数 `GOOGLE_OAUTH_ENCRYPTION_KEY`

`GOOGLE_OAUTH_ENCRYPTION_KEY` は、32バイトのランダム値をBase64化した文字列を設定します。実際の値はこのZIPに含まれていません。

Google OAuthのクライアントIDとクライアントシークレットはソースには含まれません。アプリの設定画面から登録し、D1へ暗号化保存する構成です。

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

## アプリ固有の注意点

- `.openai/hosting.json` には既存Sitesプロジェクトとの関連付けが含まれています。別プロジェクトとして複製する場合は、既存の `project_id` をそのまま流用せず、新しいSitesプロジェクトのIDに置き換えてください。

## 変更履歴

最新の変更内容は`main-app/V2.2.25_CHANGES.md`を参照してください。

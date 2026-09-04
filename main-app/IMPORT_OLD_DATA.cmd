@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==============================================
echo 坂口商会 旧データを Cloudflare D1 へ移行します
echo 対象DB: sakaguchi-main-db
echo ==============================================
echo.
echo 勤務記録/予定 63件、現場一覧22件、
echo 作業内容マスター18件、作業者名マスター4件を対象にします。
echo 既存データと一致するものは重複追加しません。
echo Google OAuth設定には触れません。
echo.
pause

npx wrangler d1 execute sakaguchi-main-db --remote --file=old-data-import.sql
if errorlevel 1 (
  echo.
  echo [ERROR] 移行中にエラーが発生しました。
  echo この画面を閉じずにスクリーンショットを送ってください。
  pause
  exit /b 1
)

echo.
echo ==============================================
echo 移行処理が完了しました。
echo アプリをCtrl+F5で再読み込みして確認してください。
echo ==============================================
pause

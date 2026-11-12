import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | 坂口商会勤怠管理アプリ",
  description: "坂口商会勤怠管理アプリにおけるGoogleユーザーデータの取り扱い",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <article>
        <p className="legal-eyebrow">PRIVACY POLICY</p>
        <h1>プライバシーポリシー</h1>
        <p>
          坂口商会勤怠管理アプリ（以下「本アプリ」）は、勤怠、予定、現場資料および
          バックアップを管理するため、必要な範囲でGoogleサービスと連携します。
        </p>

        <h2>取得・利用するGoogleユーザーデータ</h2>
        <ul>
          <li>Googleアカウントの氏名・メールアドレス：連携中のアカウント確認</li>
          <li>Googleカレンダー：勤務予定・勤務記録の作成、更新および削除</li>
          <li>Googleスプレッドシート：勤務記録の同期</li>
          <li>Google Drive：現場資料およびバックアップの保存</li>
        </ul>

        <h2>利用目的</h2>
        <p>
          取得したデータは、本アプリ内で利用者が指示した同期、保存、復元および
          バックアップ機能を提供する目的に限って使用します。広告、販売、第三者への
          販売または目的外の分析には使用しません。
        </p>

        <h2>保存と保護</h2>
        <p>
          Googleの認証情報は暗号化して保存し、Google APIとの通信にはHTTPSを使用します。
          本アプリの機能提供に必要な期間のみ保持し、Google連携を解除した場合は保存済みの
          アクセストークンと更新トークンを削除します。
        </p>

        <h2>共有</h2>
        <p>
          法令に基づく場合を除き、Googleユーザーデータを第三者へ提供しません。
          データ処理に使用するクラウドサービスには、機能提供に必要な最小限の範囲でのみ
          データが送信されます。
        </p>

        <h2>データの確認・削除</h2>
        <p>
          利用者は本アプリから記録を削除でき、設定画面からGoogle連携を解除できます。
          Google側に保存されたカレンダー、スプレッドシートおよびDriveのデータは、
          各Googleサービスから確認・削除できます。
        </p>

        <h2>Google API Services User Data Policy</h2>
        <p>
          本アプリによるGoogle APIから取得した情報の利用は、
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Google API Services User Data Policy
          </a>
          （Limited Use要件を含む）に従います。
        </p>

        <h2>お問い合わせ</h2>
        <p>お問い合わせは、Google OAuth同意画面に表示されるユーザーサポート窓口からお願いします。</p>

        <p className="legal-updated">制定日：2026年11月12日</p>
        <Link className="legal-back" href="/">アプリへ戻る</Link>
      </article>
    </main>
  );
}

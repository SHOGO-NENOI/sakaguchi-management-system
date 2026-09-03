import type { Metadata } from "next";
import { getAuthorizedGoogleEmail, KIYOTA_EMAIL } from "./authorized-user";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "清田さん用｜坂口商会総合管理システム",
  description: "坂口商会の勤怠・現場・出張・道具をまとめて管理するアプリ",
  openGraph: {
    title: "清田さん用｜坂口商会総合管理システム",
    description: "勤怠・現場・出張・道具をまとめて管理",
    images: ["https://kantan-kintai.liabrise-main-xxecla.chatgpt.site/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "清田さん用｜坂口商会総合管理システム",
    description: "勤怠・現場・出張・道具をまとめて管理",
    images: ["https://kantan-kintai.liabrise-main-xxecla.chatgpt.site/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allowed = Boolean(await getAuthorizedGoogleEmail());
  return (
    <html lang="ja">
      <body>
        {allowed ? children : (
          <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f3f7f5", color: "#15231f" }}>
            <section style={{ width: "min(100%, 520px)", padding: 32, borderRadius: 24, background: "#fff", border: "1px solid #d8e3de", boxShadow: "0 18px 50px rgba(18, 54, 43, .10)" }}>
              <p style={{ margin: "0 0 8px", color: "#287b64", fontWeight: 800, letterSpacing: ".12em", fontSize: 12 }}>KIYOTA PRIVATE ACCESS</p>
              <h1 style={{ margin: "0 0 14px", fontSize: 28 }}>Googleアカウントでログイン</h1>
              <p style={{ margin: "0 0 8px", lineHeight: 1.8 }}>清田さん専用の坂口商会総合管理システムです。</p>
              <p style={{ margin: "0 0 24px", lineHeight: 1.8, color: "#586a64" }}>{KIYOTA_EMAIL} のGoogleアカウントだけが利用できます。</p>
              <a href="/api/google/start" target="_top" style={{ display: "inline-flex", padding: "12px 18px", borderRadius: 12, background: "#1f725c", color: "#fff", textDecoration: "none", fontWeight: 800 }}>Googleでログイン</a>
            </section>
          </main>
        )}
      </body>
    </html>
  );
}

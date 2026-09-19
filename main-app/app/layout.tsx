import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sakaguchi-management-system.nenoi-shogo.workers.dev"),
  title: "坂口商会総合管理システム",
  description: "坂口商会の勤怠・現場・出張・道具をまとめて管理するアプリ",
  openGraph: {
    title: "坂口商会総合管理システム",
    description: "勤怠・現場・出張・道具をまとめて管理",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "坂口商会総合管理システム",
    description: "勤怠・現場・出張・道具をまとめて管理",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/sakaguchi-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

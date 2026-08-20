import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEON TAP — 30秒の反射神経チャレンジ",
  description: "光るターゲットを30秒間タップして、ハイスコアを狙うミニゲーム。",
  openGraph: {
    title: "NEON TAP",
    description: "30秒の反射神経チャレンジ",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEON TAP",
    description: "30秒の反射神経チャレンジ",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}

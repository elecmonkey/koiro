import type { Metadata } from "next";
import { Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const bodyFont = Zen_Kaku_Gothic_New({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const displayFont = Shippori_Mincho_B1({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Koiro (こいろ)",
  description: "个人音乐集合 — Koiro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

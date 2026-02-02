import type { Metadata } from "next";
import {
  Noto_Sans_SC,
  Noto_Serif_SC,
  Noto_Serif_JP,
  Zen_Kaku_Gothic_New,
  Shippori_Mincho_B1,
} from "next/font/google";
import EmotionRegistry from "./emotion-registry";
import { Providers } from "./providers";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import "./globals.css";

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const displayFont = Noto_Serif_SC({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const jpSansFont = Zen_Kaku_Gothic_New({
  variable: "--font-jp-sans",
  weight: ["400", "500", "700"],
});

const jpSerifFont = Shippori_Mincho_B1({
  variable: "--font-jp-serif",
  weight: ["400", "600", "700"],
});

const jpDisplayFont = Noto_Serif_JP({
  variable: "--font-jp-display",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Koiro",
  description: "个人音乐集合 — Koiro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${jpSansFont.variable} ${jpSerifFont.variable} ${jpDisplayFont.variable}`}
      >
        <EmotionRegistry>
          <Providers>
            <Navbar />
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              <div style={{ flex: 1 }}>{children}</div>
              <Footer />
            </div>
          </Providers>
        </EmotionRegistry>
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Koiro",
    short_name: "Koiro",
    description: "个人音乐集合 — Koiro",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ef",
    theme_color: "#2d6b5f",
    lang: "zh-Hans",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

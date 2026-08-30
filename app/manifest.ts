import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "楽天・eBay せどりリサーチ＆利益計算",
    short_name: "せどりツール",
    description: "楽天・eBay仕入れとメルカリ販売のリサーチ＆利益計算ツール",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf5ff",
    theme_color: "#7c3aed",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

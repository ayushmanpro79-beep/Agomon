import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agomon — Explore Various Pandals in Kolkata",
    short_name: "Agomon",
    description: "Explore Various Pandals in Kolkata — live map, metro & crowd meter for Durga Puja 2026",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#FFD60A",
    lang: "en-IN",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

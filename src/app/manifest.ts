// Buduje manifest aplikacji webowej: nazwa, ikony, kolory i tryb wyświetlania

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Realty Nest",
    short_name: "Realty Nest",
    description: "Brokerage operations in one browser tab",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f9f7",
    theme_color: "#1a7a4f",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

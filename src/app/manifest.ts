import type { MetadataRoute } from "next";
import { SHARE_TARGET_PATH, SHARE_TARGET_FIELD } from "@/lib/pwa/share-target";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "jasitadyjenom.cz – nahlaste špatné parkování",
    short_name: "jasitadyjenom",
    description:
      "Vyfoťte špatně zaparkované auto a připravte podnět pro příslušný úřad do datové schránky. Zdarma a bez sledování.",
    lang: "cs",
    dir: "ltr",
    // Installed app opens straight on the report form; the landing page is for first-time visitors
    start_url: "/nahlasit",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#fafaf7",
    categories: ["utilities", "navigation"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // "Share → jasitadyjenom" from the gallery. The service worker catches the POST in the browser,
    // so the photos never reach our server (see public/sw.js).
    share_target: {
      action: SHARE_TARGET_PATH,
      method: "POST",
      enctype: "multipart/form-data",
      params: { files: [{ name: SHARE_TARGET_FIELD, accept: ["image/*"] }] },
    },
  };
}

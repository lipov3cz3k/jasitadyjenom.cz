import type { MetadataRoute } from "next";

const SITE = "https://jasitadyjenom.cz";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/nahlasit", "/soukromi"].map((path) => ({ url: `${SITE}${path}` }));
}

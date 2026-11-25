import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";
import { PRECACHED_PAGES } from "@/lib/pwa/paths";

// Builds the service worker (src/sw/sw.ts) at build time and serves it at /serwist/sw.js.
// The HTML of the precached pages changes with every build, so each build gets a new revision.
const revision = randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/sw/sw.ts",
  additionalPrecacheEntries: PRECACHED_PAGES.map((url) => ({ url, revision })),
  globIgnores: ["public/robots.txt"],
  // Native binary from node_modules; esbuild-wasm is not installed
  useNativeEsbuild: true,
});

// Copies library files that must be served separately into public/vendor.
// MapLibre loads its web worker from a URL; once bundled by Next.js it would look in the wrong folder.
import { copyFileSync, mkdirSync } from "node:fs";

const files = [["node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/vendor/maplibre-gl-worker.mjs"]];

mkdirSync("public/vendor", { recursive: true });
for (const [from, to] of files) copyFileSync(from, to);

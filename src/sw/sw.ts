// Service worker, bundled by Serwist (app/serwist/[path]/route.ts) and served at /serwist/sw.js.
//
// - Precache: every file of the build (.next/static) and public/ (authorities.json, MapLibre worker),
//   plus the report form, the landing page and /offline. Each build replaces the previous one.
// - Other pages and RSC payloads of soft navigations: network first, last copy when offline.
// - Not touched: /api/* (AI) and other origins (map tiles, ČÚZK), which may carry the location.
// - Share target: photos shared to the installed app are kept in the browser (see lib/pwa/share-target.ts).

import { ExpirationPlugin, NetworkFirst, Serwist, type PrecacheEntry, type RouteMatchCallback, type SerwistGlobalConfig } from "serwist";
import { SHARE_TARGET_FIELD, SHARE_TARGET_PATH, SHARED_PARAM, storeSharedPhotos } from "../lib/pwa/share-target";
import { OFFLINE_PATH } from "../lib/pwa/paths";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Waiting on a weak signal longer than this, the last saved copy is better
const NETWORK_TIMEOUT_SECONDS = 4;

const isOwnPage: RouteMatchCallback = ({ url, sameOrigin }) =>
  sameOrigin && !url.pathname.startsWith("/api/") && url.pathname !== SHARE_TARGET_PATH;

const pageCache = (cacheName: string) =>
  new NetworkFirst({
    cacheName,
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  });

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // The redirect after a share must still hit the precached report form
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, new RegExp(`^${SHARED_PARAM}$`)],
  },
  skipWaiting: true,
  clientsClaim: true,
  disableDevLogs: true,
  runtimeCaching: [
    {
      matcher: (options) => options.request.headers.get("RSC") === "1" && isOwnPage(options),
      handler: pageCache("pages-rsc"),
    },
    {
      matcher: (options) => options.request.mode === "navigate" && isOwnPage(options),
      handler: pageCache("pages"),
    },
  ],
  fallbacks: {
    entries: [{ url: OFFLINE_PATH, matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.registerCapture(
  ({ url, sameOrigin }) => sameOrigin && url.pathname === SHARE_TARGET_PATH,
  ({ request }) => receiveShare(request),
  "POST",
);

serwist.addEventListeners();

async function receiveShare(request: Request): Promise<Response> {
  const target = new URL("/nahlasit", self.location.origin);
  try {
    const form = await request.formData();
    const files = form
      .getAll(SHARE_TARGET_FIELD)
      .filter((f): f is File => typeof f !== "string" && f.size > 0);
    if ((await storeSharedPhotos(files)) > 0) target.searchParams.set(SHARED_PARAM, "1");
  } catch {
    // Unreadable share – open the form anyway
  }
  return Response.redirect(target.href, 303);
}

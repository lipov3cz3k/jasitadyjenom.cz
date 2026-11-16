import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";
import { themeInitScript } from "@/lib/theme";

const siteUrl = "https://jasitadyjenom.cz";
const description =
  "Vyfoťte špatně zaparkované auto a během minuty odešlete podnět příslušnému úřadu přes datovou schránku. Zdarma a bez sledování.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "jasitadyjenom.cz – nahlaste špatné parkování",
  description,
  openGraph: {
    title: "jasitadyjenom.cz",
    description,
    url: siteUrl,
    siteName: "jasitadyjenom.cz",
    locale: "cs_CZ",
    type: "website",
  },
  // Name under the icon after "Add to Home Screen" on iOS
  appleWebApp: { capable: true, title: "jasitadyjenom", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is set by the inline script before hydration
    <html lang="cs" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <SerwistProvider
          swUrl="/serwist/sw.js"
          // A service worker in dev would serve stale code; it is tested with `next build && next start`
          disable={process.env.NODE_ENV !== "production"}
          // A reload would throw away a report in progress (photos live only in memory)
          reloadOnOnline={false}
          // Pages are cached by the service worker itself; no extra request on every navigation
          cacheOnNavigation={false}
          // The bundle has no imports; a classic worker also runs where module workers do not
          options={{ type: "classic" }}
        >
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}

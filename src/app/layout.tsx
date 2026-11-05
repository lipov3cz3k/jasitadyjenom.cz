import type { Metadata, Viewport } from "next";
import "./globals.css";

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
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}

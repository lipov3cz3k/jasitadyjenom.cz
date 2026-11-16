import { appIconResponse, type AppIconVariant } from "@/lib/pwa/icon";

// Manifest icons, rendered at build time: /icons/192.png, /icons/512.png, /icons/maskable-512.png
const icons: Record<string, { size: number; variant: AppIconVariant }> = {
  "192.png": { size: 192, variant: "any" },
  "512.png": { size: 512, variant: "any" },
  "maskable-192.png": { size: 192, variant: "maskable" },
  "maskable-512.png": { size: 512, variant: "maskable" },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(icons).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const icon = icons[(await params).name];
  if (!icon) return new Response(null, { status: 404 });
  return appIconResponse(icon.size, icon.variant);
}

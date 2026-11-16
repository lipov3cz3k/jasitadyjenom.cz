import { ImageResponse } from "next/og";

// PNG versions of app/icon.svg (the "no stopping" sign) for the web app manifest and iOS.
// Generated at build time, so there are no binary icons to keep in sync with the SVG.

export type AppIconVariant = "any" | "maskable" | "apple";

const BACKGROUND = "#fafaf7";

/**
 * - `any`: transparent, the sign fills the whole icon (same as the favicon)
 * - `maskable`: opaque, the sign fits the safe zone (inner 80 % circle) so launchers can crop it to any shape
 * - `apple`: opaque, iOS fills transparent corners with black
 */
export function appIconResponse(size: number, variant: AppIconVariant): ImageResponse {
  const scale = variant === "maskable" ? 0.72 : variant === "apple" ? 0.86 : 1;
  const sign = Math.round(size * scale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: variant === "any" ? "transparent" : BACKGROUND,
        }}
      >
        <svg width={sign} height={sign} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" fill="#d7262e" />
          <circle cx="50" cy="50" r="34" fill="#0b4ea2" />
          <g stroke="#d7262e" strokeWidth="10">
            <line x1="22" y1="22" x2="78" y2="78" />
            <line x1="78" y1="22" x2="22" y2="78" />
          </g>
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}

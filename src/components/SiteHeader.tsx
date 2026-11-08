import Link from "next/link";
import { NoStoppingSign } from "./NoStoppingSign";

export function SiteHeader({ badge }: { badge?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 py-6">
      <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
        <NoStoppingSign className="size-7" />
        jasitadyjenom.cz
      </Link>
      {badge && (
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          {badge}
        </span>
      )}
    </header>
  );
}

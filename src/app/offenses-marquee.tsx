import { LAW_NAME, offenses, type Offense } from "@/lib/offenses";

function OffenseCard({ offense, hidden }: { offense: Offense; hidden?: boolean }) {
  return (
    <li className="flex w-80 shrink-0 flex-col rounded-xl border border-border bg-surface p-5 sm:w-96">
      <h3 className="font-semibold">{offense.title}</h3>
      <blockquote className="mt-3 flex-1 border-l-4 border-line-yellow pl-3 text-sm leading-relaxed text-muted">
        „{offense.quote}“
      </blockquote>
      <a
        href={offense.url}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={hidden ? -1 : undefined}
        className="mt-4 text-sm font-medium text-sign-blue underline-offset-4 hover:underline dark:text-blue-300"
      >
        {offense.citation} {LAW_NAME} ↗
      </a>
    </li>
  );
}

// Pure-CSS marquee: the list is rendered twice and the track slides by -50%,
// so the loop is seamless. The duplicate is hidden from assistive tech.
// Pauses on hover/focus; with prefers-reduced-motion it becomes a scrollable row.
export function OffensesMarquee() {
  return (
    <div className="marquee -mx-5 overflow-x-auto sm:-mx-8">
      <div className="marquee-track flex w-max py-1">
        <ul className="flex gap-4 pr-4">
          {offenses.map((o) => (
            <OffenseCard key={o.url} offense={o} />
          ))}
        </ul>
        <ul className="marquee-duplicate flex gap-4 pr-4" aria-hidden="true">
          {offenses.map((o) => (
            <OffenseCard key={o.url} offense={o} hidden />
          ))}
        </ul>
      </div>
    </div>
  );
}

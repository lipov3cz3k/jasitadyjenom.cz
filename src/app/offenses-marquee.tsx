"use client";

import { useEffect, useRef } from "react";
import { LAW_NAME, offenses, type Offense } from "@/lib/offenses";

// Seconds for one full pass over the list.
const LOOP_SECONDS = 90;
// Auto-scroll resumes this long after the last manual interaction.
const RESUME_AFTER_MS = 3000;

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

// A natively scrollable row that auto-advances. The list is rendered twice and the
// scroll position wraps by one list width, so it loops seamlessly in both directions.
// Auto-scroll pauses on hover/focus and after any manual scroll (touch, trackpad,
// arrow buttons); with prefers-reduced-motion it never moves on its own.
export function OffensesMarquee() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const holdUntil = useRef(0);

  const hold = () => {
    holdUntil.current = performance.now() + RESUME_AFTER_MS;
  };

  // Both copies look the same, so jumping by one list width is invisible. Before the
  // user starts moving it, shift into the copy that leaves room on both sides.
  const recenter = () => {
    const el = scrollerRef.current;
    const loop = listRef.current?.offsetWidth ?? 0;
    if (!el || loop === 0) return;
    if (el.scrollLeft >= loop) el.scrollLeft -= loop;
    if (el.scrollLeft < loop / 2) el.scrollLeft += loop;
  };

  const startInteraction = () => {
    if (performance.now() >= holdUntil.current && !hovered.current && !focused.current) recenter();
    hold();
  };

  useEffect(() => {
    const el = scrollerRef.current;
    const list = listRef.current;
    if (!el || !list) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pos = el.scrollLeft;
    let lastSet = pos;
    let lastTime = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - lastTime, 100) / 1000;
      lastTime = now;
      const loop = list.offsetWidth;

      // The user (or a smooth scroll) moved it: continue from there.
      if (Math.abs(el.scrollLeft - lastSet) > 1) pos = el.scrollLeft;

      const paused = hovered.current || focused.current || now < holdUntil.current || reducedMotion.matches;
      if (!paused && loop > 0) {
        pos += (loop / LOOP_SECONDS) * dt;
        if (pos >= loop) pos -= loop;
        el.scrollLeft = pos;
      }
      lastSet = el.scrollLeft;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const step = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    const list = listRef.current;
    if (!el || !list) return;
    hold();
    recenter();
    const card = list.firstElementChild as HTMLElement | null;
    const distance = card ? card.offsetWidth + 16 : 320;
    el.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={scrollerRef}
        className="marquee -mx-5 overflow-x-auto sm:-mx-8"
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          startInteraction();
          hovered.current = true;
        }}
        onPointerLeave={() => {
          hovered.current = false;
          hold();
        }}
        onTouchStart={startInteraction}
        onTouchMove={hold}
        onWheel={startInteraction}
        onFocus={() => {
          startInteraction();
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          hold();
        }}
      >
        <div className="flex w-max py-1">
          <ul ref={listRef} className="flex gap-4 pr-4">
            {offenses.map((o) => (
              <OffenseCard key={o.url} offense={o} />
            ))}
          </ul>
          <ul className="flex gap-4 pr-4" aria-hidden="true">
            {offenses.map((o) => (
              <OffenseCard key={o.url} offense={o} hidden />
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <ArrowButton direction={-1} onClick={() => step(-1)} />
        <ArrowButton direction={1} onClick={() => step(1)} />
      </div>
    </div>
  );
}

function ArrowButton({ direction, onClick }: { direction: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction < 0 ? "Předchozí přestupek" : "Další přestupek"}
      className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
    >
      <svg
        className="size-4.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={direction < 0 ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}

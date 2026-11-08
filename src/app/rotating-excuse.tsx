"use client";

import { useEffect, useRef, useState } from "react";

const EXCUSES = [
  "na minutku odskočím",
  "zaběhnu do trafiky",
  "vyložím nákup",
  "vyzvednu balík",
  "skočím pro rohlíky",
  "vyberu z bankomatu",
  "zaparkuju na pět minut",
  "dám kafe",
  "vyřídím jeden telefon",
  "počkám na kamaráda",
];

const SHOW_MS = 3000;

// "Já si tady jenom …" with an ending that rolls up like a departure board.
// Pauses on hover; with prefers-reduced-motion it stays on the first excuse.
export function RotatingExcuse() {
  // step counts rotations; it keys the animated spans so the animation restarts.
  const [step, setStep] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = setInterval(() => {
      if (!paused.current) setStep((s) => s + 1);
    }, SHOW_MS);
    return () => clearInterval(interval);
  }, []);

  const current = EXCUSES[step % EXCUSES.length];
  const previous = step > 0 ? EXCUSES[(step - 1) % EXCUSES.length] : null;

  return (
    <p
      className="min-h-14 text-lg italic text-muted sm:min-h-0"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
    >
      „Já si tady jenom{" "}
      <span className="excuse-roll">
        {previous && (
          <span key={`out-${step}`} className="excuse-out" aria-hidden="true">
            {previous}…“
          </span>
        )}
        <span key={`in-${step}`} className={step > 0 ? "excuse-in" : undefined}>
          {current}…“
        </span>
      </span>
    </p>
  );
}

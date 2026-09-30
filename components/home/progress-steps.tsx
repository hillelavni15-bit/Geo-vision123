"use client";

import { useEffect, useState } from "react";

export interface Step {
  label: string;
  pct: number;
}

/** A progress bar that advances through labelled stages while work is running. */
export function ProgressSteps({ steps, intervalMs }: { steps: Step[]; intervalMs: number }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), intervalMs);
    return () => clearInterval(timer);
  }, [steps.length, intervalMs]);
  const step = steps[index];

  return (
    <div className="mt-8 w-full max-w-xs" role="status" aria-live="polite">
      <div className="h-1 w-full overflow-hidden rounded-full bg-secondary/50">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${step.pct}%` }}
        />
      </div>
      <p className="mt-2 text-center font-mono text-xs uppercase tracking-wider text-primary/80">{step.label}</p>
    </div>
  );
}

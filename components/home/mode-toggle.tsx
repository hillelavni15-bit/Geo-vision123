"use client";

import { Compass, Crosshair, Gamepad2, GitCompare } from "lucide-react";
import { cn } from "@/lib/cn";

export type Mode = "identify" | "discover" | "compare" | "play";

const TABS = [
  { key: "identify", icon: Crosshair, label: "Identify Photo", short: "Identify" },
  { key: "discover", icon: Compass, label: "Discover Places", short: "Discover" },
  { key: "compare", icon: GitCompare, label: "Compare", short: "Compare" },
  { key: "play", icon: Gamepad2, label: "Play", short: "Play" },
] as const;

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      className="glass-card flex w-full max-w-full items-center gap-0.5 rounded-2xl p-1 sm:w-auto sm:gap-1 sm:rounded-full"
      role="tablist"
    >
      {TABS.map(({ key, icon: Icon, label, short }) => (
        <button
          key={key}
          role="tab"
          aria-selected={mode === key}
          onClick={() => onChange(key)}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-xs font-semibold transition-all duration-300 sm:flex-none sm:gap-2 sm:rounded-full sm:px-5 sm:text-sm",
            mode === key
              ? "glow-primary bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="sm:hidden">{short}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

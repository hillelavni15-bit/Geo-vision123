"use client";

import { useCallback, useEffect, useState } from "react";
import { Compass, Gamepad2, GitCompare } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import type { HistoryItem } from "@/lib/types";
import { HistoryButton } from "./history-sheet";
import { Identify } from "./identify";
import { ModeToggle, type Mode } from "./mode-toggle";

const MODES: Mode[] = ["identify", "discover", "compare", "play"];

function modeFromUrl(): Mode {
  const tool = new URLSearchParams(window.location.search).get("tool");
  return MODES.includes(tool as Mode) ? (tool as Mode) : "identify";
}

const UPCOMING: Record<Exclude<Mode, "identify">, { icon: typeof Compass; title: string; text: string }> = {
  discover: {
    icon: Compass,
    title: "Discover Places",
    text: "Describe a vibe and a place, and get matching spots on a map. Coming in the next update.",
  },
  compare: {
    icon: GitCompare,
    title: "Compare",
    text: "Put two photos side by side and see whether they were taken in the same place. Coming in the next update.",
  },
  play: {
    icon: Gamepad2,
    title: "Play",
    text: "Guess where real photos were taken and earn coins. Coming in the next update.",
  },
};

export function HomeView() {
  const [mode, setMode] = useState<Mode>("identify");
  const [restore, setRestore] = useState<HistoryItem | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    setMode(modeFromUrl());
    const onPop = () => setMode(modeFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const changeMode = useCallback((next: Mode) => {
    setMode(next);
    window.history.pushState({}, "", `/?tool=${next}`);
  }, []);

  const pickHistory = useCallback(
    (item: HistoryItem) => {
      setRestore(item);
      if (mode !== "identify") changeMode("identify");
    },
    [mode, changeMode],
  );

  const toggle = <ModeToggle mode={mode} onChange={changeMode} />;

  return (
    <PageShell actions={<HistoryButton onPick={pickHistory} refreshKey={historyKey} />}>
      {mode === "identify" ? (
        <Identify modeToggle={toggle} restore={restore} onAnalyzed={() => setHistoryKey((k) => k + 1)} />
      ) : (
        <div className="container mx-auto flex max-w-4xl flex-1 animate-fade-up flex-col items-center px-4 py-8">
          <div className="mb-10">{toggle}</div>
          {(() => {
            const { icon: Icon, title, text } = UPCOMING[mode];
            return (
              <div className="glass-card flex max-w-xl flex-col items-center rounded-2xl p-10 text-center">
                <span className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <Icon className="size-7 text-primary" />
                </span>
                <h2 className="mb-2 text-2xl font-bold">{title}</h2>
                <p className="text-muted-foreground">{text}</p>
              </div>
            );
          })()}
        </div>
      )}
    </PageShell>
  );
}

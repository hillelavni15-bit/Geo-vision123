"use client";

import { useState } from "react";
import AiLocateTab from "@/components/AiLocateTab";
import ExifTab from "@/components/ExifTab";
import GameTab from "@/components/GameTab";
import SearchTab from "@/components/SearchTab";

const TABS = [
  { id: "ai", label: "🤖 זיהוי AI", Component: AiLocateTab },
  { id: "exif", label: "🛰️ GPS מתמונה", Component: ExifTab },
  { id: "search", label: "🔎 חיפוש מקומות", Component: SearchTab },
  { id: "game", label: "🎯 משחק ניחוש", Component: GameTab },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const [active, setActive] = useState<TabId>("ai");

  return (
    <main className="app">
      <header className="header">
        <h1>
          Geo-Vision <span>איתור מיקומים</span>
        </h1>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              className={active === t.id ? "active" : ""}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {/* Keep every tab mounted so switching tabs doesn't lose its state. */}
      {TABS.map(({ id, Component }) => (
        <div key={id} hidden={active !== id}>
          <Component />
        </div>
      ))}
    </main>
  );
}

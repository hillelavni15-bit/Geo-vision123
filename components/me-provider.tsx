"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Me } from "@/lib/types";

interface MeContextValue {
  me: Me | null;
  /** Coin balance for display: "∞" when coins are unlimited. */
  creditsLabel: string;
  refresh: () => Promise<void>;
  /** Apply a balance returned by the server after a paid action. */
  setCredits: (credits: number) => void;
}

const MeContext = createContext<MeContextValue | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) setMe(await res.json());
    } catch {
      // Keep the last known state; the header shows "–" until it loads.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setCredits = useCallback((credits: number) => {
    setMe((prev) => (prev ? { ...prev, credits } : prev));
  }, []);

  const creditsLabel = !me ? "–" : me.unlimited || me.isPro ? "∞" : String(me.credits);

  return <MeContext.Provider value={{ me, creditsLabel, refresh, setCredits }}>{children}</MeContext.Provider>;
}

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used inside MeProvider");
  return ctx;
}

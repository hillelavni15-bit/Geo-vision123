"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SEARCH_COST, type Me } from "@/lib/types";

interface MeContextValue {
  me: Me | null;
  /** Coin balance for display: "∞" when coins are unlimited. */
  creditsLabel: string;
  refresh: () => Promise<void>;
  /** Apply a balance returned by the server after a paid action. */
  setCredits: (credits: number) => void;
  /** True when this visitor pays coins for AI searches. */
  paysForSearches: boolean;
  /**
   * Check the balance and ask the visitor to confirm before a paid AI search.
   * Returns false if they can't afford it or decline.
   */
  confirmSearch: () => boolean;
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
  const paysForSearches = Boolean(me && !me.unlimited && !me.isPro);

  const confirmSearch = useCallback(() => {
    if (!paysForSearches || !me) return true;
    if (me.credits < SEARCH_COST) {
      toast.error(`You need ${SEARCH_COST} coins for this search. Play a round to earn more.`);
      return false;
    }
    return window.confirm(`Run this AI search for ${SEARCH_COST} coins? Coins are charged only if the search succeeds.`);
  }, [me, paysForSearches]);

  return (
    <MeContext.Provider value={{ me, creditsLabel, refresh, setCredits, paysForSearches, confirmSearch }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used inside MeProvider");
  return ctx;
}

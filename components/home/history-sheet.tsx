"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, Crown, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { HistoryItem } from "@/lib/types";
import { confidenceClass } from "./styles";

/** Clock button in the header that opens past analyses. */
export function HistoryButton({
  onPick,
  refreshKey,
}: {
  onPick: (item: HistoryItem) => void;
  /** Change this to reload the list, e.g. after a new analysis. */
  refreshKey: number;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ items: HistoryItem[]; limited: boolean; limit: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load, refreshKey]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open analysis history" onClick={() => setOpen(true)}>
        <Clock className="size-[18px]" />
      </Button>
      <Sheet
        open={open}
        onClose={close}
        title={
          <span className="flex items-center gap-2">
            <Clock className="size-6 text-primary" /> Analysis History
          </span>
        }
      >
        {data?.limited && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
            <span className="text-xs text-muted-foreground">Showing last {data.limit} (free)</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary">
              <Crown className="size-3" /> Pro unlocks all
            </span>
          </div>
        )}
        {failed ? (
          <p className="py-10 text-center text-muted-foreground">History couldn&apos;t be loaded. Try again later.</p>
        ) : data?.items.length ? (
          <div className="flex flex-col gap-3">
            {data.items.map((item) => {
              const unknown = item.result.status === "unknown";
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPick(item);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 overflow-hidden rounded-xl border border-card-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailDataUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-lg border border-border/30 bg-black/50 object-cover"
                  />
                  <span className="flex flex-1 flex-col gap-1 overflow-hidden">
                    <span className="truncate text-sm font-semibold">
                      {unknown ? "Location Unknown" : [item.primaryCity, item.primaryCountry].filter(Boolean).join(", ")}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      {!unknown && (
                        <Badge className={`text-[10px] uppercase ${confidenceClass(item.confidence)}`}>{item.confidence}</Badge>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : data ? (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
            <Globe2 className="mb-2 size-10 opacity-20" />
            <p>No past analyses yet.</p>
          </div>
        ) : (
          <p className="py-10 text-center text-muted-foreground">Loading…</p>
        )}
      </Sheet>
    </>
  );
}

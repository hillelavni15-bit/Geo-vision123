"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronUp, Download, HelpCircle, MapPin, RefreshCcw, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { placeLabel, type AnalysisResult } from "@/lib/types";
import { clueClass, confidenceClass } from "./styles";
import { VisualMatches } from "./visual-matches";

const LocationMap = dynamic(() => import("@/components/location-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted/30" />,
});

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function IdentifyResults({
  result,
  previewUrl,
  onReset,
}: {
  result: AnalysisResult;
  previewUrl: string | null;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (result.status === "unknown") {
    return (
      <div className="mx-auto w-full max-w-3xl animate-fade-up">
        <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-card to-transparent shadow-2xl">
          {previewUrl && (
            <div className="h-56 border-b border-border/40 bg-black sm:h-72">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="The analyzed photo" className="h-full w-full object-contain" />
            </div>
          )}
          <div className="p-7 text-center sm:p-10">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <HelpCircle className="size-7 text-amber-400" />
            </div>
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">Location Unknown</h2>
            <p className="mx-auto max-w-xl leading-relaxed text-muted-foreground">{result.guidance}</p>
            <div className="mx-auto mt-6 max-w-xl rounded-xl border border-border/50 bg-background/40 p-5 text-left">
              <h3 className="mb-2 font-semibold">Try another photo with stronger clues</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Use a clear, well-lit image with readable signs, distinctive landmarks, road markings, architecture, or a wider
                outdoor view. Blurry, tightly cropped, indoor, or generic scenes may not contain enough evidence.
              </p>
            </div>
            <Button size="lg" className="mt-7 font-bold" onClick={onReset}>
              <RefreshCcw /> Try Another Photo
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const primary = result.primaryMatch;
  const alternates = result.matches.slice(1);
  const location = placeLabel(primary);

  const share = async () => {
    const text = `I found this photo was taken in ${location} (${primary.confidence} confidence), analyzed with Where Is This?`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Where Is This?", text });
        return;
      }
    } catch {
      // Share sheet dismissed or unavailable: fall back to copying.
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Couldn't copy. Your browser blocked clipboard access.");
    }
  };

  const exportResults = () => {
    download(
      "where-is-this-result.txt",
      [
        "WHERE IS THIS? — Analysis Results",
        "===================================",
        `Location: ${location}`,
        `Confidence: ${primary.confidence}`,
        `Explanation: ${primary.explanation}`,
        "",
        "Clues detected:",
        ...primary.clues.map((c) => `  · ${c}`),
        ...(alternates.length
          ? ["", "Alternate possibilities:", ...alternates.map((a) => `  · ${placeLabel(a)} (${a.confidence})`)]
          : []),
      ].join("\n"),
    );
    toast.success("Results exported!");
  };

  return (
    <div className="flex w-full animate-fade-up flex-col">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h2 className="flex items-center gap-3 text-3xl font-bold">
          <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <ShieldCheck className="size-5 text-primary" />
          </span>
          Analysis Complete
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void share()}>
            <Share2 /> Share
          </Button>
          <Button variant="outline" size="sm" onClick={exportResults}>
            <Download /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RefreshCcw /> New Photo
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-1">
          {previewUrl && (
            <div className="aspect-square overflow-hidden rounded-xl border border-border bg-black/50 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="The analyzed photo" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="rounded-xl border border-border/50 bg-card/30 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identified Signatures</h4>
            <div className="flex flex-wrap gap-2">
              {primary.clues.length ? (
                primary.clues.map((clue, i) => (
                  <Badge key={i} className={`font-mono font-normal ${clueClass(clue)}`}>
                    {clue}
                  </Badge>
                ))
              ) : (
                <span className="text-sm italic text-muted-foreground">No distinct signatures found.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent shadow-2xl">
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/30" />
            <div className="absolute right-0 top-0 size-40 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/5 blur-2xl" />
            <div className="relative p-7">
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                    <MapPin className="size-3.5" /> Primary Match
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight">{location}</h3>
                </div>
                <Badge className={`shrink-0 self-start px-4 py-1.5 text-sm font-bold uppercase tracking-wider ${confidenceClass(primary.confidence)}`}>
                  {primary.confidence} Match
                </Badge>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground">{primary.explanation}</p>
            </div>
          </Card>
          <div className="relative z-0 min-h-[300px] flex-1 overflow-hidden rounded-xl border border-border shadow-xl md:min-h-[360px]">
            <LocationMap matches={result.matches} />
          </div>
        </div>
      </div>

      {alternates.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-8">
          <h4 className="mb-5 flex items-center gap-2 text-lg font-semibold">
            <MapPin className="size-[18px] text-muted-foreground" /> Alternate Possibilities
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {alternates.map((match, i) => {
              const open = expanded === i;
              return (
                <button
                  key={i}
                  onClick={() => setExpanded(open ? null : i)}
                  aria-expanded={open}
                  className="rounded-xl border border-card-border bg-card/50 p-5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.03]"
                >
                  <span className="mb-2 flex items-start justify-between gap-2">
                    <span className="font-bold leading-tight">{placeLabel(match)}</span>
                    <Badge className={`shrink-0 text-[10px] uppercase ${confidenceClass(match.confidence)}`}>{match.confidence}</Badge>
                  </span>
                  <span className={`block text-sm text-muted-foreground ${open ? "" : "line-clamp-2"}`}>{match.explanation}</span>
                  <span className="mt-2 flex items-center gap-1 text-xs text-primary">
                    {open ? (
                      <>
                        <ChevronUp className="size-3" /> Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3" /> More
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <VisualMatches analysisId={result.id} location={[primary.city, primary.country].filter(Boolean).join(", ")} />
    </div>
  );
}

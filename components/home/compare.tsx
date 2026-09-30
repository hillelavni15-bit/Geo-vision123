"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, GitCompare, HelpCircle, Layers, MapPin, RotateCcw, UploadCloud, XCircle } from "lucide-react";
import { useMe } from "@/components/me-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IMAGE_ACCEPT, IMAGE_HELP_TEXT, prepareImage, type PreparedImage } from "@/lib/client/image";
import { cn } from "@/lib/cn";
import { SEARCH_COST, type CompareResult, type CompareSide } from "@/lib/types";
import { confidenceClass } from "./styles";

const TIMEOUT_MS = 90_000;

const VERDICTS = {
  same: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Same Location" },
  "likely-same": {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    label: "Likely Same Location",
  },
  different: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Different Locations" },
  uncertain: { icon: HelpCircle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Uncertain" },
};

function Slot({
  label,
  image,
  preparing,
  onFile,
}: {
  label: string;
  image: PreparedImage | null;
  preparing: boolean;
  onFile: (f: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        aria-label={`Choose ${label}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {preparing ? (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5" aria-live="polite">
          <span className="size-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm font-semibold">Preparing {label.toLowerCase()}…</p>
        </div>
      ) : image ? (
        <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border/60 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.previewDataUrl} alt={label} className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              onClick={() => input.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <RotateCcw className="size-3" /> Replace
            </button>
          </div>
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
            {label}
          </span>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className={cn(
            "flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all",
            dragging ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40 hover:bg-primary/5",
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <UploadCloud className="size-5 text-primary" />
          </span>
          <span className="text-center">
            <span className="block text-sm font-semibold">Drop photo here</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{IMAGE_HELP_TEXT}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`${score} out of 100 match`}>
      <circle cx="56" cy="56" r={r} strokeWidth="8" stroke="rgba(255,255,255,0.06)" fill="none" />
      <circle
        cx="56"
        cy="56"
        r={r}
        strokeWidth="8"
        stroke={color}
        fill="none"
        strokeDasharray={`${(score / 100) * circ} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 56 56)"
        style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x="56" y="52" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="24" fontWeight="800">
        {score}
      </text>
      <text x="56" y="76" textAnchor="middle" fill="hsl(215 20% 65%)" fontSize="9" fontWeight="700" letterSpacing="1.5">
        MATCH
      </text>
    </svg>
  );
}

function SideCard({ side, label }: { side: CompareSide; label: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border/40 bg-secondary/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <MapPin className="size-3 text-primary" />
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{side.description || "No description."}</p>
      {side.landmarks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {side.landmarks.map((l) => (
            <span key={l} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" }) {
  const Icon = tone === "good" ? Layers : XCircle;
  return (
    <Card className="border-border/40 bg-card/50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn("size-4", tone === "good" ? "text-emerald-400" : "text-red-400")} />
        <h4 className={cn("text-sm font-bold", tone === "good" ? "text-emerald-400" : "text-red-400")}>{title}</h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", tone === "good" ? "bg-emerald-500" : "bg-red-500")} />
            {f}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function Compare({ modeToggle }: { modeToggle: ReactNode }) {
  const { setCredits, paysForSearches, confirmSearch } = useMe();
  const [a, setA] = useState<PreparedImage | null>(null);
  const [b, setB] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState<"A" | "B" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const load = async (file: File, which: "A" | "B") => {
    setPreparing(which);
    setError(null);
    try {
      const img = await prepareImage(file);
      (which === "A" ? setA : setB)(img);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That image could not be prepared.");
    } finally {
      setPreparing(null);
    }
  };

  const compare = async () => {
    if (!a || !b || loading || !confirmSearch()) return;
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageA: a.base64, imageB: b.base64 }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The comparison failed. You were not charged.");
      if (request.current !== controller) return;
      setResult(data.result);
      if (typeof data.credits === "number") setCredits(data.credits);
    } catch (e) {
      if (request.current !== controller) return;
      const aborted = e instanceof DOMException && e.name === "AbortError";
      setError(
        aborted
          ? "The comparison was cancelled or timed out. You were not charged."
          : e instanceof TypeError
            ? "Couldn't reach the server. Check your connection and try again. You were not charged."
            : e instanceof Error
              ? e.message
              : "The comparison failed. You were not charged.",
      );
    } finally {
      window.clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  };

  const reset = () => {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setA(null);
    setB(null);
    setResult(null);
    setError(null);
  };

  const verdict = result ? VERDICTS[result.verdict] : null;

  return (
    <div className="container mx-auto max-w-4xl animate-fade-up px-4 py-8">
      <div className="mb-8 flex justify-center">{modeToggle}</div>
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <GitCompare className="size-3.5" /> AI location forensics
        </div>
        <h2 className="mb-2 text-2xl font-bold">Compare Two Photos</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Upload two photos and the AI decides whether they were taken at the same place, and explains why.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <Slot label="Photo A" image={a} preparing={preparing === "A"} onFile={(f) => void load(f, "A")} />
        <div className="flex shrink-0 items-center justify-center">
          <span className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-secondary/60">
            <GitCompare className="size-[18px] text-muted-foreground" />
          </span>
        </div>
        <Slot label="Photo B" image={b} preparing={preparing === "B"} onFile={(f) => void load(f, "B")} />
      </div>

      {error && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400" role="alert">
          <AlertCircle className="size-5 shrink-0" />
          <p className="flex-1 text-sm font-medium">{error}</p>
          {a && b && (
            <Button variant="outline" size="sm" onClick={() => void compare()}>
              Retry
            </Button>
          )}
        </div>
      )}

      <div className="mb-8 flex items-center justify-center gap-3">
        <Button size="lg" onClick={() => void compare()} disabled={!a || !b || loading} className="px-8 font-bold shadow-lg shadow-primary/20">
          {loading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              Analyzing…
            </>
          ) : (
            <>
              <GitCompare /> {paysForSearches ? `Compare · ${SEARCH_COST} coins` : "Compare Locations"}
            </>
          )}
        </Button>
        {(a || b || result) && (
          <Button variant="ghost" size="lg" onClick={reset} className="text-muted-foreground">
            <RotateCcw /> Reset
          </Button>
        )}
      </div>

      {loading && (
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-6 py-3 text-sm font-medium text-primary">
            <span className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            Comparing landmarks, architecture and terrain…
          </div>
        </div>
      )}

      {result && verdict && (
        <div className="animate-fade-up space-y-5">
          <Card className="border-border/40 bg-card/80 p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="shrink-0">
                <ScoreRing score={result.matchScore} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className={cn("mb-3 inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold", verdict.bg)}>
                  <verdict.icon className={cn("size-4", verdict.color)} />
                  <span className={verdict.color}>{verdict.label}</span>
                  <Badge className={`ml-1 text-[10px] uppercase ${confidenceClass(result.confidence)}`}>{result.confidence} confidence</Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{result.reasoning}</p>
              </div>
            </div>
          </Card>
          <div className="flex flex-col gap-4 sm:flex-row">
            <SideCard side={result.photoA} label="Photo A" />
            <SideCard side={result.photoB} label="Photo B" />
          </div>
          {(result.sharedFeatures.length > 0 || result.differences.length > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {result.sharedFeatures.length > 0 && <FeatureList title="Shared Features" items={result.sharedFeatures} tone="good" />}
              {result.differences.length > 0 && <FeatureList title="Key Differences" items={result.differences} tone="bad" />}
            </div>
          )}
        </div>
      )}

      {!a && !b && !result && !loading && (
        <div className="py-8 text-center text-muted-foreground">
          <GitCompare className="mx-auto mb-3 size-10 opacity-20" />
          <p className="text-sm">Upload two photos above to get started</p>
        </div>
      )}
    </div>
  );
}

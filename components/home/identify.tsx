"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Camera, Crosshair, Sparkles, UploadCloud } from "lucide-react";
import { HeroGlobe } from "@/components/hero-globe";
import { useMe } from "@/components/me-provider";
import { Button } from "@/components/ui/button";
import { IMAGE_ACCEPT, IMAGE_HELP_TEXT, prepareImage, type PreparedImage } from "@/lib/client/image";
import { cn } from "@/lib/cn";
import { SEARCH_COST, type AnalysisResult, type HistoryItem } from "@/lib/types";
import { IdentifyResults } from "./identify-results";
import { ProgressSteps } from "./progress-steps";

const STEPS = [
  { label: "Uploading image", pct: 15 },
  { label: "Scanning landmarks", pct: 35 },
  { label: "Cross-referencing geo", pct: 55 },
  { label: "Analyzing culture", pct: 75 },
  { label: "Finalizing results", pct: 92 },
];

const TRUST_POINTS = [
  { title: "Evidence first", text: "See the visual clues behind an identified match." },
  { title: "No forced guesses", text: "Unclear photos return Location Unknown." },
  { title: "Privacy minded", text: "Only upload images you have permission to analyze." },
];

const TIMEOUT_MS = 90_000;

export function Identify({
  modeToggle,
  restore,
  onAnalyzed,
}: {
  modeToggle: ReactNode;
  /** A history entry to show again. */
  restore: HistoryItem | null;
  onAnalyzed: () => void;
}) {
  const { setCredits, paysForSearches, confirmSearch } = useMe();
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!restore) return;
    request.current?.abort();
    requestId.current += 1;
    setResult(restore.result);
    setPreviewUrl(restore.thumbnailDataUrl);
    setPrepared(null);
    setError(null);
    setAnalyzing(false);
  }, [restore]);

  const clearInputs = () => {
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
  };

  const reset = useCallback(() => {
    request.current?.abort();
    requestId.current += 1;
    setPrepared(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setPreparing(false);
    setAnalyzing(false);
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
  }, []);

  const choose = async (file: File | null | undefined) => {
    if (!file) return;
    request.current?.abort();
    requestId.current += 1;
    setError(null);
    setResult(null);
    setAnalyzing(false);
    setPreparing(true);
    try {
      const image = await prepareImage(file);
      setPrepared(image);
      setPreviewUrl(image.previewDataUrl);
    } catch (e) {
      setPrepared(null);
      setPreviewUrl(null);
      setError(e instanceof Error ? e.message : "That image could not be prepared.");
    } finally {
      setPreparing(false);
      clearInputs();
    }
  };

  const analyze = async () => {
    if (!prepared || analyzing) return;
    if (!confirmSearch()) return;

    const id = ++requestId.current;
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: prepared.base64, thumbnailDataUrl: prepared.thumbnailDataUrl }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (id !== requestId.current) return;
      if (!res.ok) throw new Error(data.error ?? "Analysis failed. Please try again. You were not charged.");
      setResult(data.result);
      if (typeof data.credits === "number") setCredits(data.credits);
      onAnalyzed();
    } catch (e) {
      if (id !== requestId.current) return;
      const aborted = e instanceof DOMException && e.name === "AbortError";
      setError(
        aborted
          ? "Analysis was cancelled or timed out. You were not charged."
          : e instanceof TypeError
            ? "Couldn't reach the server. Check your connection and try again. You were not charged."
            : e instanceof Error
              ? e.message
              : "Analysis failed. You were not charged.",
      );
    } finally {
      window.clearTimeout(timer);
      if (id === requestId.current) setAnalyzing(false);
    }
  };

  const inputs = (
    <>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept={IMAGE_ACCEPT}
        aria-label="Choose an image to analyze"
        onChange={(e) => void choose(e.target.files?.[0])}
      />
      <input
        ref={cameraInput}
        type="file"
        className="hidden"
        accept={IMAGE_ACCEPT}
        capture="environment"
        aria-label="Take a photo to analyze"
        onChange={(e) => void choose(e.target.files?.[0])}
      />
    </>
  );

  const errorBox = error && (
    <div
      className="mt-6 flex w-full flex-wrap items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive"
      role="alert"
    >
      <AlertTriangle className="size-5 shrink-0" />
      <p className="flex-1">{error}</p>
      {prepared && (
        <Button variant="outline" size="sm" onClick={() => void analyze()} disabled={analyzing}>
          Retry
        </Button>
      )}
    </div>
  );

  // ── Results ──
  if (result) {
    return (
      <div className="container mx-auto flex max-w-6xl flex-1 flex-col px-4 py-8">
        <div className="mb-8 flex justify-center">{modeToggle}</div>
        <IdentifyResults result={result} previewUrl={previewUrl} onReset={reset} />
      </div>
    );
  }

  // ── Preview and analyzing ──
  if (previewUrl) {
    return (
      <div className="container mx-auto flex max-w-4xl flex-1 animate-fade-up flex-col items-center px-4 py-8">
        {inputs}
        <div className="mb-6 flex justify-center">{modeToggle}</div>
        <div className="relative max-h-[60vh] w-full overflow-hidden rounded-2xl border border-border/50 bg-black shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview of the photo to analyze"
            className={cn(
              "max-h-[60vh] w-full object-contain transition-all duration-700",
              analyzing && "scale-105 opacity-30 blur-sm",
            )}
          />
          {analyzing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/30 backdrop-blur-sm">
              <div className="relative mb-2 size-24">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <div className="absolute inset-2 animate-spin-reverse-slow rounded-full border-2 border-primary/30 border-b-transparent [animation-duration:1.5s]" />
                <Crosshair className="absolute inset-0 m-auto size-8 animate-pulse text-primary" />
              </div>
              <ProgressSteps steps={STEPS} intervalMs={1800} />
            </div>
          )}
        </div>
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <Button variant="outline" size="lg" onClick={reset} className="flex-1 md:flex-none">
            {analyzing ? "Cancel Analysis" : "Remove"}
          </Button>
          {!analyzing && (
            <Button variant="outline" size="lg" onClick={() => fileInput.current?.click()} className="flex-1 md:flex-none">
              Replace image
            </Button>
          )}
          <Button
            size="lg"
            onClick={() => void analyze()}
            disabled={analyzing || !prepared}
            className="flex-1 font-bold shadow-lg shadow-primary/20 md:flex-none"
          >
            {analyzing
              ? "Analyzing…"
              : paysForSearches
                ? `Run Analysis · ${SEARCH_COST} coins`
                : "Run Analysis"}
            {!analyzing && <ArrowRight className="!size-5" />}
          </Button>
        </div>
        {errorBox}
      </div>
    );
  }

  // ── Hero and upload ──
  return (
    <div className="container mx-auto flex max-w-6xl flex-1 animate-fade-up flex-col px-4 py-8">
      <div className="mb-10 flex flex-col items-center gap-10 pt-4 lg:flex-row">
        <div className="w-full min-w-0 flex-1 text-center lg:text-left">
          <div className="glass-card glow-soft mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> AI-powered location detection
          </div>
          <h1 className="mb-4 text-5xl font-bold leading-none tracking-tight md:text-6xl">
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
              Where In
            </span>
            <br />
            <span className="text-gradient animate-gradient-x drop-shadow-[0_2px_24px_hsla(180,100%,50%,0.35)]">
              The World?
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-md text-lg font-light text-muted-foreground lg:mx-0">
            Upload a photo and our AI looks for reliable location clues. If the evidence is not strong enough, it clearly
            says so.
          </p>
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TRUST_POINTS.map(({ title, text }) => (
              <div key={title} className="rounded-xl border border-primary/10 bg-card/30 p-3 text-left">
                <span className="text-sm font-semibold">{title}</span>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center lg:justify-start">{modeToggle}</div>
        </div>
        <div className="relative size-72 shrink-0 md:size-80">
          <div className="pointer-events-none absolute -inset-10 animate-drift rounded-full bg-primary/10 blur-3xl" />
          <HeroGlobe />
        </div>
      </div>

      {inputs}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload an image. ${IMAGE_HELP_TEXT}.`}
        onClick={() => fileInput.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInput.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void choose(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "bg-grid glass-card flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 sm:p-10",
          dragging ? "glow-primary scale-[1.01] border-primary" : "border-primary/15 hover:border-primary/50",
        )}
      >
        <div
          className={cn(
            "mb-5 flex size-[72px] items-center justify-center rounded-2xl transition-all duration-300",
            dragging ? "scale-110 bg-primary/20" : "bg-secondary",
          )}
        >
          {preparing ? (
            <span className="size-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          ) : (
            <UploadCloud className={cn("size-9 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
          )}
        </div>
        <h3 className="mb-1.5 text-xl font-semibold">{preparing ? "Preparing image…" : "Drop your image here"}</h3>
        <p className="mb-5 text-sm text-muted-foreground">{IMAGE_HELP_TEXT}</p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            className="px-6"
            disabled={preparing}
            onClick={(e) => {
              e.stopPropagation();
              fileInput.current?.click();
            }}
          >
            <UploadCloud /> Choose from Library
          </Button>
          <Button
            variant="secondary"
            className="px-6"
            disabled={preparing}
            onClick={(e) => {
              e.stopPropagation();
              cameraInput.current?.click();
            }}
          >
            <Camera /> Take a Photo
          </Button>
        </div>
      </div>
      {errorBox}
    </div>
  );
}

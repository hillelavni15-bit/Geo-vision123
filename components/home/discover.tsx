"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Building2,
  Camera,
  ChevronDown,
  ChevronUp,
  Compass,
  Crown,
  Flame,
  Globe2,
  History,
  MapPin,
  Moon,
  Mountain,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sunset,
  TreePine,
  Waves,
  X,
} from "lucide-react";
import { useMe } from "@/components/me-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatKm } from "@/lib/geo";
import { SEARCH_COST, type DiscoverPlace, type DiscoverResult } from "@/lib/types";
import { ProgressSteps } from "./progress-steps";

const DiscoverMap = dynamic(() => import("@/components/discover-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted/30" />,
});

const STEPS = [
  { label: "Understanding location", pct: 20 },
  { label: "Finding place ideas", pct: 45 },
  { label: "Matching visual style", pct: 70 },
  { label: "Ranking results", pct: 90 },
];

const MOODS = [
  { icon: Mountain, label: "Dramatic landscape", desc: "rugged mountains, epic vistas, dramatic terrain" },
  { icon: Building2, label: "Urban architecture", desc: "iconic buildings, city skylines, urban streets" },
  { icon: TreePine, label: "Lush nature", desc: "dense forests, peaceful parks, green landscapes" },
  { icon: Waves, label: "Coastal & water", desc: "beaches, cliffs, harbors, riverside scenery" },
  { icon: Sunset, label: "Golden hour", desc: "warm light, sunset views, magic hour photography" },
  { icon: Moon, label: "Night scene", desc: "city lights at night, neon signs, illuminated streets" },
  { icon: Camera, label: "Cinematic street", desc: "moody alleyways, film-like atmosphere, gritty textures" },
  { icon: Flame, label: "Desert & arid", desc: "red sand dunes, rocky desert, vast arid landscape" },
];

const RECENT_KEY = "wit_recent_searches";
const TIMEOUT_MS = 90_000;

type Recent = { location: string; description: string };

function loadRecent(): Recent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((s) => typeof s?.location === "string" && typeof s?.description === "string").slice(0, 6)
      : [];
  } catch {
    return [];
  }
}

function saveRecent(list: Recent[]) {
  try {
    if (list.length) localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    else localStorage.removeItem(RECENT_KEY);
  } catch {
    // Storage unavailable (private mode): recent searches just won't persist.
  }
}

function typeClass(type: string) {
  switch (type) {
    case "landmark":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "park":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "historic":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "nature":
      return "bg-lime-500/10 text-lime-400 border-lime-500/20";
    case "street":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default:
      return "bg-secondary/50 text-secondary-foreground border-border";
  }
}

const scoreColor = (s: number) => (s > 70 ? "bg-emerald-500" : s >= 40 ? "bg-amber-500" : "bg-red-500");

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "whitespace-nowrap rounded-md border px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-white/10 text-foreground hover:bg-white/5",
      )}
    >
      {children}
    </button>
  );
}

function ProPhotoTile({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/15 via-secondary/40 to-muted text-primary",
        className,
      )}
    >
      <Crown className="size-4" />
      <span className="text-[11px] font-semibold">Photo with Pro</span>
    </div>
  );
}

export function Discover({ modeToggle }: { modeToggle: ReactNode }) {
  const { setCredits, paysForSearches, confirmSearch, me } = useMe();
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"best" | "closest">("best");
  const [view, setView] = useState<"list" | "grid">("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const cards = useRef<Record<string, HTMLElement | null>>({});
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    setRecent(loadRecent());
    return () => request.current?.abort();
  }, []);

  const search = useCallback(
    async (loc: string, desc: string) => {
      loc = loc.trim();
      desc = desc.trim();
      if (!loc || !desc || pending) return;
      if (!confirmSearch()) return;

      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
      setPending(true);
      setError(null);
      setResult(null);
      setActiveId(null);
      setExpanded({});
      setFilter("all");
      try {
        const res = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: loc, description: desc }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "The search failed. You were not charged.");
        setResult(data.result);
        if (typeof data.credits === "number") setCredits(data.credits);
        setRecent((prev) => {
          const next = [{ location: loc, description: desc }, ...prev.filter((s) => s.location !== loc || s.description !== desc)].slice(0, 6);
          saveRecent(next);
          return next;
        });
      } catch (e) {
        if (request.current !== controller) return;
        const aborted = e instanceof DOMException && e.name === "AbortError";
        setError(
          aborted
            ? "The search was cancelled or timed out. You were not charged."
            : e instanceof TypeError
              ? "Couldn't reach the server. Check your connection and try again. You were not charged."
              : e instanceof Error
                ? e.message
                : "The search failed. You were not charged.",
        );
      } finally {
        window.clearTimeout(timer);
        if (request.current === controller) {
          request.current = null;
          setPending(false);
        }
      }
    },
    [pending, confirmSearch, setCredits],
  );

  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setPending(false);
  };

  const reset = () => {
    cancel();
    setResult(null);
    setError(null);
  };

  const select = (id: string) => {
    setActiveId(id);
    cards.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // ── Searching ──
  if (pending) {
    return (
      <div className="bg-grid flex flex-1 flex-col items-center justify-center p-8">
        <div className="relative mb-4 size-36">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div className="absolute inset-3 animate-spin-reverse-slow rounded-full border-2 border-primary/20 border-b-transparent [animation-duration:2s]" />
          <Compass className="absolute inset-0 m-auto size-14 animate-pulse text-primary" />
        </div>
        <ProgressSteps steps={STEPS} intervalMs={2200} />
        <Button variant="outline" className="mt-7" onClick={cancel}>
          Cancel Search
        </Button>
      </div>
    );
  }

  // ── Results ──
  if (result) {
    const types = ["all", ...Array.from(new Set(result.places.map((p) => p.placeType)))];
    const shown = result.places
      .filter((p) => filter === "all" || p.placeType === filter)
      .sort((a, b) => (sort === "best" ? b.matchScore - a.matchScore : a.distanceKm - b.distanceKm));

    return (
      <div className="flex flex-1 animate-fade-up flex-col">
        <div className="border-b border-border/40 bg-card/60 px-4 py-3">
          <div className="container mx-auto flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">{result.locationName}</h2>
              <p className="text-sm text-muted-foreground">{result.places.length} places found</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {modeToggle}
              <Button variant="outline" size="sm" onClick={reset}>
                <RefreshCcw /> New Search
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto flex flex-1 flex-col gap-5 p-4 lg:flex-row">
          <div className="flex w-full flex-col gap-3 lg:w-1/2 xl:w-2/5">
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {types.map((t) => (
                  <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
              <div className="ml-auto flex gap-1.5">
                <Chip active={sort === "best"} onClick={() => setSort("best")}>
                  Best
                </Chip>
                <Chip active={sort === "closest"} onClick={() => setSort("closest")}>
                  Closest
                </Chip>
                <Chip active={false} onClick={() => setView((v) => (v === "list" ? "grid" : "list"))}>
                  {view === "list" ? "Grid" : "List"}
                </Chip>
              </div>
            </div>

            <div className="-mx-1 max-h-none overflow-y-auto px-1 lg:max-h-[calc(100dvh-14rem)]">
              {shown.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
                  No places match this filter.
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-2 gap-3 pb-4">
                  {shown.map((place) => (
                    <GridCard
                      key={place.id}
                      place={place}
                      number={result.places.indexOf(place) + 1}
                      active={activeId === place.id}
                      onSelect={() => select(place.id)}
                      refCb={(el) => {
                        cards.current[place.id] = el;
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3 pb-4">
                  {shown.map((place) => (
                    <ListCard
                      key={place.id}
                      place={place}
                      number={result.places.indexOf(place) + 1}
                      active={activeId === place.id}
                      expanded={Boolean(expanded[place.id])}
                      onToggle={() => setExpanded((e) => ({ ...e, [place.id]: !e[place.id] }))}
                      onSelect={() => select(place.id)}
                      refCb={(el) => {
                        cards.current[place.id] = el;
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative z-0 h-[50vh] w-full shrink-0 overflow-hidden rounded-xl border border-border shadow-2xl lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)] lg:w-1/2 xl:w-3/5">
            <DiscoverMap
              places={result.places.filter((p) => filter === "all" || p.placeType === filter)}
              center={[result.centerLat, result.centerLng]}
              activeId={activeId}
              onSelect={select}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Search form ──
  const selectedMood = MOODS.find((m) => m.desc === description.trim());
  return (
    <div className="container mx-auto max-w-3xl animate-fade-up px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Globe2 className="size-3.5" /> AI-guided place ideas
        </div>
        <h2 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">Discover Places</h2>
        <p className="text-lg font-light text-muted-foreground">
          Describe a mood or vibe and get place ideas to explore. Verify details before planning a visit.
        </p>
      </div>
      <div className="mb-8 flex justify-center">{modeToggle}</div>

      {me && !me.isPro && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.08] to-primary/[0.04] p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Crown className="size-4 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">Pro members see photos for every result</p>
            <p className="text-xs text-muted-foreground">Real images of each discovered location.</p>
          </div>
        </div>
      )}

      <form
        className="mb-6 flex flex-col gap-5 rounded-xl border border-card-border bg-card/50 p-6 shadow-2xl backdrop-blur-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void search(location, description);
        }}
      >
        <div>
          <label htmlFor="discover-location" className="mb-2 block text-sm font-semibold">
            Location
          </label>
          <input
            id="discover-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            placeholder="e.g. Paris, France  ·  Tokyo, Japan  ·  Wadi Rum, Jordan"
            className="h-12 w-full rounded-md border border-input bg-background/50 px-3 text-base placeholder:text-muted-foreground/70"
          />
        </div>
        <div>
          <label htmlFor="discover-description" className="mb-2.5 block text-sm font-semibold">
            Mood / Description
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            {MOODS.map(({ icon: Icon, label, desc }) => (
              <button
                type="button"
                key={label}
                onClick={() => setDescription(desc)}
                aria-pressed={selectedMood?.label === label}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  selectedMood?.label === label
                    ? "border-primary/40 bg-primary/20 text-primary shadow-sm shadow-primary/20"
                    : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-3 shrink-0" />
                {label}
              </button>
            ))}
          </div>
          <textarea
            id="discover-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={400}
            placeholder="or describe in your own words — dramatic mountain landscape, neon-lit night market, quiet cobblestone alleys..."
            className="min-h-[90px] w-full resize-none rounded-md border border-input bg-background/50 px-3 py-2 text-base placeholder:text-muted-foreground/70"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={!location.trim() || !description.trim()}
          className="h-11 w-full text-base font-bold shadow-lg shadow-primary/20"
        >
          <Search className="!size-5" /> {paysForSearches ? `Search Places · ${SEARCH_COST} coins` : "Search Places"}
        </Button>
      </form>

      {recent.length > 0 && (
        <div className="mb-6">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="size-3.5 text-primary" /> Recent searches
            </span>
            <button
              onClick={() => {
                setRecent([]);
                saveRecent([]);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" /> Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setLocation(s.location);
                  setDescription(s.description);
                  void search(s.location, s.description);
                }}
                className="glass-card flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:border-primary/40"
                title={`${s.location} · ${s.description}`}
              >
                <MapPin className="size-3.5 shrink-0 text-primary" />
                <span className="flex min-w-0 flex-col">
                  <span className="max-w-[180px] truncate text-xs font-semibold">{s.location}</span>
                  <span className="max-w-[180px] truncate text-[10px] text-muted-foreground">{s.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive"
          role="alert"
        >
          <AlertTriangle className="size-5 shrink-0" />
          <p className="flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void search(location, description)}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

function PlaceNumber({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
      {n}
    </span>
  );
}

function ListCard({
  place,
  number,
  active,
  expanded,
  onToggle,
  onSelect,
  refCb,
}: {
  place: DiscoverPlace;
  number: number;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  refCb: (el: HTMLElement | null) => void;
}) {
  return (
    <Card
      ref={refCb}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "cursor-pointer overflow-hidden transition-all duration-300",
        active ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-2 ring-primary" : "hover:border-primary/40",
      )}
    >
      {place.imageUrl ? (
        <div className="relative h-28 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={place.imageUrl} alt={place.name} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <Badge className={`absolute bottom-2 left-2 text-[10px] capitalize ${typeClass(place.placeType)}`}>{place.placeType}</Badge>
        </div>
      ) : place.photoLocked ? (
        <ProPhotoTile className="h-20 w-full" />
      ) : (
        <div className="flex h-8 items-end bg-gradient-to-r from-secondary/30 to-muted px-3 py-1.5">
          <Badge className={`text-[10px] capitalize ${typeClass(place.placeType)}`}>{place.placeType}</Badge>
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-2.5">
            <PlaceNumber n={number} />
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight">{place.name}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">
                  {formatKm(place.distanceKm)} · {place.address}
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="font-mono text-sm font-bold text-primary">{place.matchScore}%</span>
            <div className="mt-1 h-1.5 w-12 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full ${scoreColor(place.matchScore)}`} style={{ width: `${place.matchScore}%` }} />
            </div>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          {place.moodTags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
              {tag}
            </span>
          ))}
        </div>
        <p className={cn("text-sm text-muted-foreground", !expanded && "line-clamp-2")}>{place.description}</p>
        <button
          className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" /> Less
            </>
          ) : (
            <>
              <ChevronDown className="size-3" /> More
            </>
          )}
        </button>
      </div>
    </Card>
  );
}

function GridCard({
  place,
  number,
  active,
  onSelect,
  refCb,
}: {
  place: DiscoverPlace;
  number: number;
  active: boolean;
  onSelect: () => void;
  refCb: (el: HTMLElement | null) => void;
}) {
  return (
    <Card
      ref={refCb}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn("cursor-pointer overflow-hidden transition-all", active ? "ring-2 ring-primary" : "hover:border-primary/40")}
    >
      <div className="relative h-24 w-full bg-secondary/30">
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt={place.name} className="h-full w-full object-cover" loading="lazy" />
        ) : place.photoLocked ? (
          <ProPhotoTile className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/40">No photo</div>
        )}
        <span className="absolute left-1.5 top-1.5">
          <PlaceNumber n={number} />
        </span>
        <span className="absolute right-1.5 top-1.5 rounded-full bg-background/80 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
          {place.matchScore}%
        </span>
      </div>
      <div className="p-2.5">
        <p className="truncate text-xs font-semibold leading-tight">{place.name}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{formatKm(place.distanceKm)}</p>
      </div>
    </Card>
  );
}

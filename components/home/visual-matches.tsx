"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ImageIcon, Images, Palette, ScanEye, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SimilarPhoto, VisualMatches as Matches, VisualProfile, WebImage } from "@/lib/types";

const SCENES: Record<string, { label: string; color: string }> = {
  urban: { label: "Urban", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  coastal: { label: "Coastal", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  mountain: { label: "Mountain", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  rural: { label: "Rural", color: "bg-green-500/15 text-green-300 border-green-500/30" },
  desert: { label: "Desert", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  forest: { label: "Forest", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  indoor: { label: "Indoor", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  other: { label: "Other", color: "bg-secondary/50 text-secondary-foreground border-border" },
};

const TIMES: Record<string, string> = {
  day: "Daytime",
  golden_hour: "Golden Hour",
  night: "Night",
  overcast: "Overcast",
  dawn: "Dawn",
  dusk: "Dusk",
};

const POLL_MS = 1500;
const MAX_POLLS = 12;

function Signature({ profile }: { profile: VisualProfile }) {
  const scene = SCENES[profile.sceneType] ?? SCENES.other;
  return (
    <Card className="border-border/40 bg-card/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <ScanEye className="size-4 text-primary" />
        <h4 className="text-sm font-bold">Visual Signature</h4>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge className={scene.color}>{scene.label}</Badge>
        <Badge className="border-white/10 bg-secondary/30 text-secondary-foreground">{TIMES[profile.timeOfDay] ?? profile.timeOfDay}</Badge>
        {profile.season !== "unknown" && (
          <Badge className="border-white/10 bg-secondary/30 capitalize text-secondary-foreground">{profile.season}</Badge>
        )}
        {profile.architecturalStyle && (
          <Badge className="border-blue-500/20 bg-blue-500/10 capitalize text-blue-400">{profile.architecturalStyle}</Badge>
        )}
      </div>
      {profile.dominantColors.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Palette className="size-3.5" /> Dominant colours
          </span>
          <div className="flex gap-2">
            {profile.dominantColors.map((c) => (
              <span key={c} className="size-8 rounded-lg border border-white/10 shadow-inner" style={{ background: c }} title={c} />
            ))}
          </div>
        </div>
      )}
      {profile.elements.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-medium text-muted-foreground">Detected elements</span>
          <div className="flex flex-wrap gap-1.5">
            {profile.elements.map((e) => (
              <span key={e} className="rounded-full border border-border/50 bg-secondary/40 px-2.5 py-1 text-[11px] capitalize text-secondary-foreground">
                {e}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile.atmosphere && (
        <p className="border-t border-border/30 pt-3 text-xs italic leading-relaxed text-muted-foreground">{profile.atmosphere}</p>
      )}
    </Card>
  );
}

function Similar({ items }: { items: SimilarPhoto[] }) {
  return (
    <Card className="border-border/40 bg-card/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="size-4 text-primary" />
          <h4 className="text-sm font-bold">Visually Similar Photos</h4>
        </div>
        <span className="text-xs text-muted-foreground">{items.length} found</span>
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <ImageIcon className="mx-auto mb-2 size-8 opacity-20" />
          <p className="text-sm">No similar photos in your history yet.</p>
          <p className="mt-1 text-xs opacity-70">Analyze more photos to build your library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((s) => (
            <div key={s.analysisId} className="relative aspect-square overflow-hidden rounded-lg border border-border/40 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.thumbnailDataUrl} alt={s.place} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                <p className="truncate text-[10px] font-semibold leading-tight text-white">{s.place || "Unknown place"}</p>
              </div>
              <span className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                {s.similarityPct}%
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function LocationPhotos({ images, location }: { images: WebImage[]; location: string }) {
  return (
    <Card className="border-border/40 bg-card/50 p-5">
      <div className="mb-4">
        <h4 className="text-sm font-bold">Location Photos</h4>
        <p className="text-[10px] text-muted-foreground">Real photos of {location} from Wikimedia Commons</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {images.map((img) => (
          <a
            key={img.pageUrl}
            href={img.pageUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border/40 bg-black"
            title={`${img.description} — ${img.attribution}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.thumbUrl} alt={img.description} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
              <p className="line-clamp-1 text-[9px] text-white/70">{img.attribution}</p>
            </div>
            <ExternalLink className="absolute right-1.5 top-1.5 size-3.5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        ))}
      </div>
    </Card>
  );
}

/** Visual profile, similar past photos and reference photos for an identified result. */
export function VisualMatches({ analysisId, location }: { analysisId: string; location: string }) {
  const [matches, setMatches] = useState<Matches | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [images, setImages] = useState<WebImage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    setMatches(null);
    setGaveUp(false);
    const poll = async (attempt: number) => {
      try {
        const res = await fetch(`/api/visual/${analysisId}`, { cache: "no-store" });
        const data: Matches | null = res.ok ? await res.json() : null;
        if (cancelled) return;
        if (data?.ready) return setMatches(data);
      } catch {
        // Retry below.
      }
      if (cancelled) return;
      if (attempt >= MAX_POLLS) setGaveUp(true);
      else timer = window.setTimeout(() => void poll(attempt + 1), POLL_MS);
    };
    void poll(1);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [analysisId]);

  useEffect(() => {
    let cancelled = false;
    setImages(null);
    fetch(`/api/photos?location=${encodeURIComponent(location)}`)
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d: { images: WebImage[] }) => !cancelled && setImages(d.images))
      .catch(() => !cancelled && setImages([]));
    return () => {
      cancelled = true;
    };
  }, [location]);

  return (
    <section className="mt-10 border-t border-border/40 pt-8" aria-label="Image intelligence">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Sparkles className="size-5 text-primary" />
        </span>
        <div>
          <h3 className="text-2xl font-bold">Image Intelligence</h3>
          <p className="text-sm text-muted-foreground">AI-powered visual analysis and matching</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {matches?.profile ? (
          <Signature profile={matches.profile} />
        ) : (
          <Card className="flex items-center justify-center border-border/40 bg-card/50 p-10 text-sm text-muted-foreground">
            {gaveUp ? "The visual profile isn't available for this photo." : "Reading the photo's visual style…"}
          </Card>
        )}
        {matches ? (
          <Similar items={matches.similar} />
        ) : (
          <Card className="h-48 animate-pulse border-border/40 bg-card/50" />
        )}
      </div>

      {images === null ? (
        <Card className="mt-5 h-40 animate-pulse border-border/40 bg-card/50" />
      ) : (
        images.length > 0 && (
          <div className="mt-5">
            <LocationPhotos images={images} location={location} />
          </div>
        )
      )}
    </section>
  );
}

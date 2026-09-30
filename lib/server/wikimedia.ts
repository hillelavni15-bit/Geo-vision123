import "server-only";
import type { WebImage } from "@/lib/types";
import { fetchJson } from "./fetch-json";

/** The lead photo of the English Wikipedia article with this exact title, if any. */
export async function wikipediaPhoto(title: string, width = 480): Promise<string | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&redirects=1` +
    `&pithumbsize=${width}&titles=${encodeURIComponent(title)}`;
  const data = await fetchJson<{ query?: { pages?: Record<string, { thumbnail?: { source: string } }> } }>(url, 5000);
  const page = Object.values(data?.query?.pages ?? {})[0];
  return page?.thumbnail?.source ?? null;
}

function clean(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

interface CommonsPage {
  title?: string;
  imageinfo?: {
    url?: string;
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

/** Freely licensed photos of a place from Wikimedia Commons, with attribution. */
export async function commonsPhotos(location: string, limit = 8): Promise<WebImage[]> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json` +
    `&generator=search&gsrnamespace=6&gsrlimit=${limit * 2}` +
    `&gsrsearch=${encodeURIComponent(`${location} landmark`)}` +
    `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=600`;
  const data = await fetchJson<{ query?: { pages?: Record<string, CommonsPage> } }>(url, 6000);
  const images: WebImage[] = [];
  for (const page of Object.values(data?.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info?.url || !/\.(jpe?g|png|webp)$/i.test(info.url)) continue;
    const meta = info.extmetadata ?? {};
    const title = (page.title ?? "").replace(/^File:/, "").replace(/\.[a-z]+$/i, "");
    const author = clean(meta.Artist?.value) || "Wikimedia Commons";
    const license = clean(meta.LicenseShortName?.value);
    images.push({
      title,
      thumbUrl: info.thumburl ?? info.url,
      pageUrl: info.descriptionurl ?? info.url,
      description: (clean(meta.ImageDescription?.value) || title).slice(0, 200),
      attribution: [author, license].filter(Boolean).join(" · "),
    });
    if (images.length >= limit) break;
  }
  return images;
}

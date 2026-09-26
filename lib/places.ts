import type { LatLon } from "./geo";

// OpenStreetMap Nominatim — free, no key. Usage policy: max 1 request/second, no bulk use.
const NOMINATIM = "https://nominatim.openstreetmap.org";

export interface Place {
  name: string;
  location: LatLon;
  type: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

export async function searchPlaces(query: string, limit = 6): Promise<Place[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${NOMINATIM}/search?format=jsonv2&accept-language=he,en&limit=${limit}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`חיפוש נכשל (${res.status})`);
  const data = (await res.json()) as NominatimResult[];
  return data.map((r) => ({
    name: r.display_name,
    location: { lat: Number(r.lat), lon: Number(r.lon) },
    type: r.type ?? "",
  }));
}

export async function reverseGeocode({ lat, lon }: LatLon): Promise<string | null> {
  const url = `${NOMINATIM}/reverse?format=jsonv2&accept-language=he,en&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string; error?: string };
  return data.display_name ?? null;
}

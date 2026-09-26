export interface LatLon {
  lat: number;
  lon: number;
}

export const EARTH_RADIUS_KM = 6371.0088;

export function isValidLatLon(p: Partial<LatLon> | null | undefined): p is LatLon {
  return (
    !!p &&
    typeof p.lat === "number" &&
    typeof p.lon === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lon >= -180 &&
    p.lon <= 180
  );
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatCoords({ lat, lon }: LatLon): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}°${ns}, ${Math.abs(lon).toFixed(5)}°${ew}`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} מ׳`;
  if (km < 100) return `${km.toFixed(1)} ק״מ`;
  return `${Math.round(km).toLocaleString("he-IL")} ק״מ`;
}

export function googleMapsUrl({ lat, lon }: LatLon): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

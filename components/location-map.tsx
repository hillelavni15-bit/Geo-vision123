"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LocationMatch } from "@/lib/types";
import { placeLabel } from "@/lib/types";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

/** Show every located match: zoom in on a single one, or fit them all. */
function FitMatches({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 12);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/** Map of the primary match (bright) and alternatives (dim). */
export default function LocationMap({ matches }: { matches: LocationMatch[] }) {
  const located = matches.filter((m) => m.latitude !== null && m.longitude !== null);
  const primary = matches[0];

  if (!primary || primary.latitude === null || primary.longitude === null) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-muted bg-muted/30 p-6 text-center text-muted-foreground">
        <span className="mb-2 block opacity-50">Coordinates Unavailable</span>
        <span className="text-sm">We couldn&apos;t pinpoint exact coordinates for this location.</span>
      </div>
    );
  }

  const center: [number, number] = [primary.latitude, primary.longitude];
  return (
    <MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
      <FitMatches points={located.map((m) => [m.latitude!, m.longitude!] as [number, number])} />
      {located.map((m, i) => (
        <CircleMarker
          key={i}
          center={[m.latitude!, m.longitude!]}
          radius={i === 0 ? 11 : 8}
          pathOptions={{
            color: "#0a0e17",
            weight: 2,
            fillColor: i === 0 ? "hsl(180 100% 45%)" : "hsl(40 95% 55%)",
            fillOpacity: i === 0 ? 1 : 0.85,
          }}
        >
          <Popup>
            <strong>{placeLabel(m)}</strong>
            <br />
            Confidence: <span className="capitalize">{m.confidence}</span>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

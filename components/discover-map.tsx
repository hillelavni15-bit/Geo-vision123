"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { DiscoverPlace } from "@/lib/types";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

function numberedIcon(n: number, active: boolean) {
  const size = active ? 34 : 26;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font:700 ${active ? 14 : 12}px var(--font-sans);color:#0a0e17;background:${active ? "hsl(180 100% 55%)" : "hsl(180 100% 40%)"};border:2px solid #0a0e17;box-shadow:0 0 ${active ? 18 : 8}px hsl(180 100% 45% / 0.6)">${n}</div>`,
  });
}

function Fit({ places, center }: { places: DiscoverPlace[]; center: [number, number] }) {
  const map = useMap();
  const key = places.map((p) => p.id).join("|");
  useEffect(() => {
    if (places.length === 0) map.setView(center, 11);
    else map.fitBounds(places.map((p) => [p.latitude, p.longitude] as [number, number]), { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function FlyTo({ place }: { place: DiscoverPlace | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (place) map.flyTo([place.latitude, place.longitude], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [map, place]);
  return null;
}

/** Numbered pins for discovered places; the active one is enlarged and centred. */
export default function DiscoverMap({
  places,
  center,
  activeId,
  onSelect,
}: {
  places: DiscoverPlace[];
  center: [number, number];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer center={center} zoom={11} className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
      <Fit places={places} center={center} />
      <FlyTo place={places.find((p) => p.id === activeId)} />
      {places.map((p, i) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={numberedIcon(i + 1, p.id === activeId)}
          zIndexOffset={p.id === activeId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(p.id) }}
        >
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.matchScore}% match
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

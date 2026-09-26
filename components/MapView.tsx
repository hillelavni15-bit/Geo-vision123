"use client";

import { useEffect, useRef } from "react";
import { Circle, CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { LatLon } from "@/lib/geo";

export interface MapMarker {
  position: LatLon;
  label?: string;
  color?: string;
}

export interface MapViewProps {
  markers?: MapMarker[];
  circle?: { center: LatLon; radiusKm: number };
  line?: [LatLon, LatLon];
  onClick?: (p: LatLon) => void;
  /** When this key changes, the map re-fits to the markers. */
  fitKey?: string | number;
  height?: number | string;
}

const toLL = (p: LatLon): [number, number] => [p.lat, p.lon];

function ClickHandler({ onClick }: { onClick?: (p: LatLon) => void }) {
  useMapEvents({
    click(e) {
      onClick?.({ lat: e.latlng.lat, lon: L.Util.wrapNum(e.latlng.lng, [-180, 180], true) });
    },
  });
  return null;
}

function fit(map: L.Map, points: LatLon[], animate: boolean) {
  if (points.length === 0) {
    map.setView([25, 10], 2, { animate });
  } else if (points.length === 1) {
    const zoom = Math.max(map.getZoom(), 12);
    if (animate) map.flyTo(toLL(points[0]), zoom, { duration: 0.8 });
    else map.setView(toLL(points[0]), zoom, { animate: false });
  } else {
    const bounds = L.latLngBounds(points.map(toLL)).pad(0.3);
    if (animate) map.flyToBounds(bounds, { duration: 0.8, maxZoom: 14 });
    else map.fitBounds(bounds, { animate: false, maxZoom: 14 });
  }
}

function FitBounds({ points, fitKey }: { points: LatLon[]; fitKey?: string | number }) {
  const map = useMap();
  const pending = useRef<LatLon[] | null>(null);

  useEffect(() => {
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) {
      // Map is in a hidden tab: Leaflet can't compute a view yet, so fit once it becomes visible.
      pending.current = points;
      return;
    }
    fit(map, points, true);
    // Only re-fit when the caller says the content changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      const size = map.getSize();
      if (pending.current && size.x > 0 && size.y > 0) {
        fit(map, pending.current, false);
        pending.current = null;
      }
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function MapView({ markers = [], circle, line, onClick, fitKey, height = 420 }: MapViewProps) {
  const fitPoints = [...markers.map((m) => m.position), ...(circle ? [circle.center] : [])];

  return (
    <MapContainer
      center={[25, 10]}
      zoom={2}
      minZoom={2}
      worldCopyJump
      style={{ height, width: "100%", cursor: onClick ? "crosshair" : undefined }}
      className="map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onClick} />
      <FitBounds points={fitPoints} fitKey={fitKey} />
      {circle && (
        <Circle
          center={toLL(circle.center)}
          radius={circle.radiusKm * 1000}
          pathOptions={{ color: "#6d5dfc", fillOpacity: 0.12, weight: 1 }}
        />
      )}
      {line && <Polyline positions={line.map(toLL)} pathOptions={{ color: "#333", dashArray: "6 6", weight: 2 }} />}
      {markers.map((m, i) => (
        <CircleMarker
          key={`${m.position.lat},${m.position.lon},${i}`}
          center={toLL(m.position)}
          radius={9}
          pathOptions={{ color: "#fff", weight: 2, fillColor: m.color ?? "#e5484d", fillOpacity: 1 }}
        >
          {m.label && <Popup>{m.label}</Popup>}
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

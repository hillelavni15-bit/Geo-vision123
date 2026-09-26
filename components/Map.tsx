"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map only renders in the browser.
const Map = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map map-loading">טוען מפה…</div>,
});

export default Map;
export type { MapMarker, MapViewProps } from "./MapView";

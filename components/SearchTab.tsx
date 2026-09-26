"use client";

import { useRef, useState } from "react";
import Map from "./Map";
import { formatCoords, googleMapsUrl, type LatLon } from "@/lib/geo";
import { reverseGeocode, searchPlaces, type Place } from "@/lib/places";

export default function SearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  // address: undefined while loading, null when no address was found
  const [pin, setPin] = useState<{ location: LatLon; address?: string | null; label: string } | null>(null);
  const latestSearch = useRef(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("מחפש…");
    const request = ++latestSearch.current;
    try {
      const found = await searchPlaces(query);
      if (request !== latestSearch.current) return;
      setResults(found);
      setSelected(found[0] ?? null);
      setPin(null);
      setStatus(found.length ? null : "לא נמצאו תוצאות");
      setFitKey((k) => k + 1);
    } catch (err) {
      if (request !== latestSearch.current) return;
      setResults([]);
      setSelected(null);
      setError(err instanceof TypeError ? "אין חיבור לשירות החיפוש. נסו שוב." : err instanceof Error ? err.message : String(err));
      setStatus(null);
    }
  };

  const dropPin = async (location: LatLon, label: string) => {
    setPin({ location, address: undefined, label });
    setFitKey((k) => k + 1);
    const address = await reverseGeocode(location).catch(() => null);
    setPin((p) => (p && p.location === location ? { ...p, address } : p));
  };

  const locateMe = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("הדפדפן לא תומך באיתור מיקום");
      return;
    }
    setStatus("מאתר את המיקום שלך…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus(null);
        dropPin({ lat: pos.coords.latitude, lon: pos.coords.longitude }, "המיקום שלי");
      },
      (err) => {
        setStatus(null);
        setError(err.code === err.PERMISSION_DENIED ? "לא ניתנה הרשאה לאיתור מיקום" : "לא הצלחנו לאתר מיקום");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <section className="tab">
      <p className="lead">חפשו כתובת, עיר או מקום, או לחצו על המפה כדי לדעת מה נמצא שם.</p>
      <form className="search" onSubmit={search}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="לדוגמה: מגדל עזריאלי, תל אביב"
          aria-label="חיפוש מקום"
        />
        <button type="submit" disabled={!query.trim()}>
          חיפוש
        </button>
        <button type="button" className="secondary" onClick={locateMe}>
          📍 המיקום שלי
        </button>
      </form>
      {status && <div className="status">{status}</div>}
      {error && <div className="error">{error}</div>}

      <div className="split">
        <div className="side">
          {pin && (
            <div className="card">
              <h3>{pin.label}</h3>
              <div className="mono">{formatCoords(pin.location)}</div>
              <p>{pin.address === undefined ? "מאתר כתובת…" : (pin.address ?? "לא נמצאה כתובת לנקודה הזו")}</p>
              <a href={googleMapsUrl(pin.location)} target="_blank" rel="noreferrer">
                פתיחה ב-Google Maps ↗
              </a>
            </div>
          )}
          <ul className="results">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  className={r === selected ? "active" : ""}
                  onClick={() => {
                    setSelected(r);
                    setPin(null);
                    setFitKey((k) => k + 1);
                  }}
                >
                  <strong>{r.name.split(",")[0]}</strong>
                  <small>{r.name}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="main">
          <Map
            fitKey={fitKey}
            onClick={(p) => dropPin(p, "נקודה שנבחרה")}
            markers={
              pin
                ? [{ position: pin.location, label: pin.label, color: "#30a46c" }]
                : selected
                  ? [{ position: selected.location, label: selected.name }]
                  : []
            }
          />
        </div>
      </div>
    </section>
  );
}

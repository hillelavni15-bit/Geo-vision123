"use client";

import { useRef, useState } from "react";
import Map from "./Map";
import PhotoPicker from "./PhotoPicker";
import { readPhotoMetadata } from "@/lib/exif";
import { formatCoords, formatDistance, googleMapsUrl, haversineKm, type LatLon } from "@/lib/geo";
import { prepareImage } from "@/lib/image";
import type { LocationGuess } from "@/lib/locate";

const CONFIDENCE_LABEL: Record<LocationGuess["confidence"], string> = {
  high: "ביטחון גבוה",
  medium: "ביטחון בינוני",
  low: "ביטחון נמוך",
};

export default function AiLocateTab() {
  const [preview, setPreview] = useState<string | null>(null);
  const [guess, setGuess] = useState<LocationGuess | null>(null);
  const [actual, setActual] = useState<LatLon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState(0);
  const latest = useRef(0);

  const analyse = async ([file]: File[]) => {
    const request = ++latest.current;
    const isCurrent = () => request === latest.current;
    setError(null);
    setGuess(null);
    setActual(null);
    setPreview(null);
    setLoading(true);
    try {
      const [image, meta] = await Promise.all([
        prepareImage(file).catch(() => {
          throw new Error("לא ניתן לקרוא את התמונה. ייתכן שהפורמט (למשל HEIC) לא נתמך בדפדפן. נסו JPEG או PNG.");
        }),
        readPhotoMetadata(file),
      ]);
      if (!isCurrent()) return;
      setPreview(image.previewUrl);
      setActual(meta.location);
      const res = await fetch("/api/locate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: image.data, mediaType: image.mediaType }),
      });
      const json = await res.json().catch(() => ({ error: `שגיאת שרת (${res.status})` }));
      if (!isCurrent()) return;
      if (!res.ok) throw new Error(json.error ?? "שגיאה לא צפויה");
      setGuess(json.guess);
      setRunId((n) => n + 1);
    } catch (e) {
      if (!isCurrent()) return;
      setError(e instanceof TypeError ? "אין חיבור לשרת. בדקו את החיבור לאינטרנט." : e instanceof Error ? e.message : String(e));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  const guessPos = guess ? { lat: guess.lat, lon: guess.lon } : null;
  const place = guess ? [guess.placeName, guess.city, guess.region, guess.country].filter(Boolean).join(", ") : "";

  return (
    <section className="tab">
      <p className="lead">
        העלו תמונה וה-AI ינתח רמזים ויזואליים (שלטים, שפה, אדריכלות, צמחייה, כבישים) כדי לנחש איפה היא צולמה.
        נתוני ה-GPS של התמונה לא נשלחים — אם יש כאלה, נשווה אליהם את הניחוש.
      </p>
      <PhotoPicker onFiles={analyse} />
      {error && <div className="error">{error}</div>}

      <div className="split">
        <div className="side">
          {preview && <img className="photo" src={preview} alt="התמונה שהועלתה" />}
          {loading && <div className="status">מנתח את התמונה… זה יכול לקחת עד דקה</div>}
          {guess && guessPos && (
            <div className="card">
              <h3>{place || "מיקום משוער"}</h3>
              <div className="meta">
                <span className={`badge ${guess.confidence}`}>{CONFIDENCE_LABEL[guess.confidence]}</span>
                <span>רדיוס ~{formatDistance(guess.radiusKm)}</span>
              </div>
              <div className="mono">{formatCoords(guessPos)}</div>
              {actual && (
                <div className="compare">
                  מיקום אמיתי לפי GPS: <span className="mono">{formatCoords(actual)}</span>
                  <br />
                  הניחוש רחוק <strong>{formatDistance(haversineKm(guessPos, actual))}</strong>
                </div>
              )}
              {guess.clues.length > 0 && (
                <>
                  <h4>רמזים</h4>
                  <ul>
                    {guess.clues.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
              {guess.reasoning && (
                <>
                  <h4>הסבר</h4>
                  <p>{guess.reasoning}</p>
                </>
              )}
              <a href={googleMapsUrl(guessPos)} target="_blank" rel="noreferrer">
                פתיחה ב-Google Maps ↗
              </a>
            </div>
          )}
        </div>
        <div className="main">
          <Map
            fitKey={runId}
            circle={guessPos ? { center: guessPos, radiusKm: guess!.radiusKm } : undefined}
            line={guessPos && actual ? [guessPos, actual] : undefined}
            markers={[
              ...(guessPos ? [{ position: guessPos, label: "ניחוש ה-AI", color: "#6d5dfc" }] : []),
              ...(actual ? [{ position: actual, label: "מיקום אמיתי (GPS)", color: "#30a46c" }] : []),
            ]}
          />
        </div>
      </div>
    </section>
  );
}

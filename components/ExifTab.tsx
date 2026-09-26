"use client";

import { useEffect, useRef, useState } from "react";
import Map from "./Map";
import PhotoPicker from "./PhotoPicker";
import { readPhotoMetadata, type PhotoMetadata } from "@/lib/exif";
import { formatCoords, googleMapsUrl } from "@/lib/geo";
import { reverseGeocode } from "@/lib/places";

interface Photo {
  id: string;
  name: string;
  url: string;
  meta: PhotoMetadata;
  address?: string | null;
}

export default function ExifTab() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const addFiles = async (files: File[]) => {
    setLoading(true);
    const added = await Promise.all(
      files.map(async (f) => ({
        id: `${f.name}-${f.size}-${f.lastModified}`,
        name: f.name,
        url: URL.createObjectURL(f),
        meta: await readPhotoMetadata(f),
      })),
    );
    urls.current.push(...added.map((p) => p.url));
    setPhotos((prev) => [...prev.filter((p) => !added.some((a) => a.id === p.id)), ...added]);
    setLoading(false);
    const firstWithGps = added.find((p) => p.meta.location);
    if (firstWithGps) select(firstWithGps);
  };

  const select = async (photo: Photo) => {
    setSelected(photo.id);
    if (!photo.meta.location || photo.address !== undefined) return;
    const address = await reverseGeocode(photo.meta.location).catch(() => null);
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, address } : p)));
  };

  const withGps = photos.filter((p) => p.meta.location);
  const current = photos.find((p) => p.id === selected);

  return (
    <section className="tab">
      <p className="lead">
        בחרו תמונה אחת או יותר מהטלפון או מהמצלמה. אם נשמר בהן מיקום GPS, הן יוצגו על המפה. הקבצים לא
        יוצאים מהמכשיר שלכם.
      </p>
      <PhotoPicker multiple onFiles={addFiles} label="גררו תמונות לכאן או לחצו לבחירה" />
      <p className="hint">
        טיפ: אפליקציות צ׳אט ורשתות חברתיות מוחקות את נתוני ה-GPS. כדאי להשתמש בקובץ המקורי.
      </p>
      {loading && <div className="status">קורא נתונים…</div>}

      <div className="split">
        <div className="side">
          {photos.length > 0 && (
            <div className="summary">
              {withGps.length} מתוך {photos.length} תמונות עם מיקום
            </div>
          )}
          <ul className="photo-list">
            {photos.map((p) => (
              <li key={p.id}>
                <button className={p.id === selected ? "active" : ""} onClick={() => select(p)}>
                  <img src={p.url} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.meta.location ? formatCoords(p.meta.location) : "אין נתוני GPS"}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {current && (
            <div className="card">
              <img className="photo" src={current.url} alt={current.name} />
              {current.meta.location ? (
                <>
                  <div className="mono">{formatCoords(current.meta.location)}</div>
                  {current.address === undefined ? (
                    <div className="status">מאתר כתובת…</div>
                  ) : (
                    current.address && <p>{current.address}</p>
                  )}
                  <a href={googleMapsUrl(current.meta.location)} target="_blank" rel="noreferrer">
                    פתיחה ב-Google Maps ↗
                  </a>
                </>
              ) : (
                <p>לתמונה הזו אין נתוני מיקום. נסו את לשונית ״זיהוי AI״.</p>
              )}
              <dl>
                {current.meta.takenAt && (
                  <>
                    <dt>צולם</dt>
                    <dd>{current.meta.takenAt.toLocaleString("he-IL")}</dd>
                  </>
                )}
                {current.meta.camera && (
                  <>
                    <dt>מצלמה</dt>
                    <dd>{current.meta.camera}</dd>
                  </>
                )}
                {current.meta.altitudeM !== null && (
                  <>
                    <dt>גובה</dt>
                    <dd>{Math.round(current.meta.altitudeM)} מ׳</dd>
                  </>
                )}
              </dl>
            </div>
          )}
        </div>
        <div className="main">
          <Map
            fitKey={`${withGps.length}-${selected}`}
            markers={withGps.map((p) => ({
              position: p.meta.location!,
              label: p.name,
              color: p.id === selected ? "#e5484d" : "#6d5dfc",
            }))}
          />
        </div>
      </div>
    </section>
  );
}

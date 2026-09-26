import { isValidLatLon, type LatLon } from "./geo";

export interface PhotoMetadata {
  location: LatLon | null;
  altitudeM: number | null;
  takenAt: Date | null;
  camera: string | null;
}

/** Read GPS location and capture details from a photo's EXIF data (runs in the browser). */
export async function readPhotoMetadata(file: Blob): Promise<PhotoMetadata> {
  // Loaded lazily: exifr probes for Node built-ins when evaluated during server prerendering.
  const { default: exifr } = await import("exifr");
  const tags = await exifr
    .parse(file, { gps: true, tiff: true, exif: true })
    .catch(() => null);

  if (!tags) return { location: null, altitudeM: null, takenAt: null, camera: null };

  const location = { lat: tags.latitude, lon: tags.longitude };
  const camera = [tags.Make, tags.Model].filter(Boolean).join(" ").trim();
  const taken = tags.DateTimeOriginal ?? tags.CreateDate ?? null;

  return {
    location: isValidLatLon(location) ? location : null,
    altitudeM: typeof tags.GPSAltitude === "number" ? tags.GPSAltitude : null,
    takenAt: taken instanceof Date && !Number.isNaN(taken.getTime()) ? taken : null,
    camera: camera || null,
  };
}

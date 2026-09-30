const MAX_BYTES = 10 * 1024 * 1024;
const ANALYSIS_MAX_SIDE = 1600;
const THUMBNAIL_MAX_SIDE = 320;

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";
export const IMAGE_HELP_TEXT = "JPEG, PNG, WebP, GIF, or HEIC up to 10 MB";

export interface PreparedImage {
  /** JPEG for the AI, base64 without the data: prefix. */
  base64: string;
  previewDataUrl: string;
  thumbnailDataUrl: string;
}

type Kind = "jpeg" | "png" | "gif" | "webp" | "heic";

function startsWith(bytes: Uint8Array, offset: number, expected: number[]) {
  return expected.every((b, i) => bytes[offset + i] === b);
}

/** Identify the real format from the file's first bytes, ignoring its name and declared type. */
function sniff(bytes: Uint8Array): Kind | null {
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, 0, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (startsWith(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, 8, [0x57, 0x45, 0x42, 0x50])) return "webp";
  if (startsWith(bytes, 4, [0x66, 0x74, 0x79, 0x70])) {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "heic";
  }
  return null;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // Applies the EXIF orientation, so phone photos come out upright.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function toJpeg(source: CanvasImageSource, width: number, height: number, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser could not prepare the image.");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height); // transparent PNGs get a black background
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Validate a chosen file and turn it into a compressed JPEG plus a small thumbnail. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size <= 0) throw new Error("That file is empty. Choose a valid image.");
  if (file.size > MAX_BYTES) throw new Error("That image is larger than 10 MB.");

  const kind = sniff(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!kind) throw new Error("Unsupported or invalid image. Choose a JPEG, PNG, WebP, GIF, or HEIC image.");

  let image: ImageBitmap | HTMLImageElement;
  try {
    image = await decode(file);
  } catch {
    throw new Error(
      kind === "heic"
        ? "This browser can't open HEIC photos. Choose it from your iPhone photo library, or export it as JPEG."
        : "This image appears to be damaged and could not be opened.",
    );
  }

  const width = "naturalWidth" in image ? image.naturalWidth : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight : image.height;
  if (!width || !height) throw new Error("This image has invalid dimensions.");

  try {
    const previewDataUrl = toJpeg(image, width, height, ANALYSIS_MAX_SIDE, 0.85);
    const thumbnailDataUrl = toJpeg(image, width, height, THUMBNAIL_MAX_SIDE, 0.7);
    return { base64: previewDataUrl.split(",")[1], previewDataUrl, thumbnailDataUrl };
  } finally {
    if ("close" in image) image.close();
  }
}

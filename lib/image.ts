export interface PreparedImage {
  data: string; // base64, no data: prefix
  mediaType: "image/jpeg";
  previewUrl: string;
}

/**
 * Downscale an image in the browser to at most `maxSide` px and re-encode as JPEG.
 * Keeps uploads small and within the API's image limits. Also strips EXIF,
 * so the AI has to work from what is visible in the picture.
 */
export async function prepareImage(file: Blob, maxSide = 1568, quality = 0.88): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { data: dataUrl.split(",")[1], mediaType: "image/jpeg", previewUrl: dataUrl };
}

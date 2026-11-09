/** Préparation de la photo dans le navigateur, avant l'envoi (SCRUM-165). */

export const PHOTO_NOT_IMAGE = "Le fichier n'est pas une image.";
export const PHOTO_TOO_LARGE = "L'image dépasse 5 Mo.";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTO_SIDE = 1600;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export interface PreparedPhoto {
  width: number;
  height: number;
  /** WebP déjà réduit : c'est cette image que le parent recadre. */
  dataUrl: string;
}

export interface CroppedPhoto {
  base64: string;
  previewUrl: string;
  contentType: 'image/webp';
}

/**
 * Refuse un fichier qui n'est pas JPEG, PNG, GIF ou WebP, ou qui dépasse 5 Mo.
 * Réduit le plus grand côté à 1600 px sans agrandir, puis convertit en WebP.
 * Un GIF animé devient sa première image.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(PHOTO_NOT_IMAGE);
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error(PHOTO_TOO_LARGE);
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(PHOTO_NOT_IMAGE);
  }
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_PHOTO_SIDE ? MAX_PHOTO_SIDE / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = draw(bitmap, 0, 0, bitmap.width, bitmap.height, width, height);
    return { width, height, dataUrl: webpDataUrl(canvas) };
  } finally {
    bitmap.close();
  }
}

/**
 * Retient le carré renvoyé par le recadrage, seulement s'il est un WebP sous 5 Mo.
 * Le déplacement du cadre est fait par ngx-image-cropper.
 */
export function acceptCroppedWebp(value: string): CroppedPhoto {
  const previewUrl = value.startsWith('data:') ? value : `data:image/webp;base64,${value}`;
  if (!previewUrl.startsWith('data:image/webp')) {
    throw new Error(PHOTO_NOT_IMAGE);
  }
  if (dataUrlBytes(previewUrl) > MAX_PHOTO_BYTES) {
    throw new Error(PHOTO_TOO_LARGE);
  }
  const comma = previewUrl.indexOf(',');
  return {
    base64: previewUrl.slice(comma + 1),
    previewUrl,
    contentType: 'image/webp',
  };
}

function draw(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(dw));
  canvas.height = Math.max(1, Math.round(dh));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(PHOTO_NOT_IMAGE);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function webpDataUrl(canvas: HTMLCanvasElement): string {
  let quality = 0.92;
  let data = canvas.toDataURL('image/webp', quality);
  if (!data.startsWith('data:image/webp')) {
    throw new Error(PHOTO_NOT_IMAGE);
  }
  while (dataUrlBytes(data) > MAX_PHOTO_BYTES && quality > 0.5) {
    quality = Math.round((quality - 0.1) * 10) / 10;
    data = canvas.toDataURL('image/webp', quality);
  }
  if (dataUrlBytes(data) > MAX_PHOTO_BYTES) {
    throw new Error(PHOTO_TOO_LARGE);
  }
  return data;
}

function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((payload.length * 3) / 4);
}


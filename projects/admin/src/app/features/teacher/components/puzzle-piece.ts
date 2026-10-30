import { ClickZone, ellipseBox, pieceFrame, rectangleBox } from './click-zone';

const MAX_SIDE = 480;

/** Magnétisme par défaut : 8 % de la largeur de l'image. Même valeur que le back. */
export const MAGNET_DEFAULT = 0.08;

/** Magnétisme maximum : 25 % de la largeur de l'image. */
export const MAGNET_MAX = 0.25;

/** Même à 0 %, la pièce se colle si elle est à moins de 4 pixels du trou. */
const MAGNET_FLOOR_PX = 4;

export function clampMagnet(value: number): number {
  if (!Number.isFinite(value)) {
    return MAGNET_DEFAULT;
  }
  return Math.min(MAGNET_MAX, Math.max(0, value));
}

/**
 * Place le coin haut-gauche de la pièce. S'il est dans le rayon du magnétisme,
 * il revient exactement sur la découpe. Sinon il reste où il a été lâché.
 * Le rayon est une fraction de la largeur affichée de l'image.
 */
export function magnetizedPosition(
  raw: { x: number; y: number },
  home: { x: number; y: number },
  magnet: number,
  bounds: { width: number; height: number },
): { x: number; y: number; snapped: boolean } {
  const width = bounds.width > 0 ? bounds.width : 1;
  const height = bounds.height > 0 ? bounds.height : 1;
  const reach = Math.max(clampMagnet(magnet) * width, MAGNET_FLOOR_PX);
  const dx = (raw.x - home.x) * width;
  const dy = (raw.y - home.y) * height;
  if (Math.hypot(dx, dy) <= reach) {
    return { x: home.x, y: home.y, snapped: true };
  }
  return { x: raw.x, y: raw.y, snapped: false };
}

/**
 * Une pièce lâchée sur l'image y reste, à l'endroit du lâcher.
 * Le magnétisme la colle sur sa découpe seulement si elle est assez près.
 * Lâchée entièrement en dehors, elle retourne en bas.
 */
export function placeOnImage(
  raw: { x: number; y: number },
  frame: { x: number; y: number; width: number; height: number },
  magnet: number,
  bounds: { width: number; height: number },
): { x: number; y: number } | null {
  const spot = magnetizedPosition(raw, frame, magnet, bounds);
  const onImage =
    spot.x < 1 && spot.y < 1 && spot.x + frame.width > 0 && spot.y + frame.height > 0;
  if (!onImage) {
    return null;
  }
  return { x: spot.x, y: spot.y };
}

/**
 * Découpe une pièce dans les pixels de l'image, avec la même proportion que la forme
 * dessinée dessus. Le fond hors de la forme reste transparent.
 */
export function cutPiece(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  zone: ClickZone,
): string {
  const frame = pieceFrame(zone);
  if (sourceWidth < 1 || sourceHeight < 1 || frame.width <= 0 || frame.height <= 0) {
    return '';
  }
  const fullWidth = Math.max(1, Math.round(frame.width * sourceWidth));
  const fullHeight = Math.max(1, Math.round(frame.height * sourceHeight));
  const downscale = Math.min(1, MAX_SIDE / Math.max(fullWidth, fullHeight));
  const pixelWidth = Math.max(1, Math.round(fullWidth * downscale));
  const pixelHeight = Math.max(1, Math.round(fullHeight * downscale));
  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }
  const destWidth = pixelWidth / frame.width;
  const destHeight = pixelHeight / frame.height;
  trace(ctx, zone, frame.x, frame.y, destWidth, destHeight);
  ctx.clip();
  ctx.drawImage(image, -frame.x * destWidth, -frame.y * destHeight, destWidth, destHeight);
  return canvas.toDataURL('image/png');
}

/**
 * Retire de l'image les pixels qui sont dans les pièces.
 * L'emplacement découpé reste transparent : c'est le trou, la vignette emporte le dessin.
 */
export function punchPieces(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  zones: ClickZone[],
): string {
  if (sourceWidth < 1 || sourceHeight < 1 || zones.length === 0) {
    return '';
  }
  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  ctx.globalCompositeOperation = 'destination-out';
  for (const zone of zones) {
    trace(ctx, zone, 0, 0, sourceWidth, sourceHeight);
    ctx.fill();
  }
  return canvas.toDataURL('image/png');
}

function trace(
  ctx: CanvasRenderingContext2D,
  zone: ClickZone,
  originX: number,
  originY: number,
  scaleX: number,
  scaleY: number,
): void {
  ctx.beginPath();
  if (zone.shape === 'rect') {
    const box = rectangleBox(zone.points);
    ctx.rect((box.x - originX) * scaleX, (box.y - originY) * scaleY, box.width * scaleX, box.height * scaleY);
    return;
  }
  if (zone.shape === 'ellipse') {
    const box = ellipseBox(zone.points);
    ctx.ellipse(
      (box.cx - originX) * scaleX,
      (box.cy - originY) * scaleY,
      Math.max(1, box.rx * scaleX),
      Math.max(1, box.ry * scaleY),
      0,
      0,
      Math.PI * 2,
    );
    return;
  }
  zone.points.forEach((point, index) => {
    const x = (point.x - originX) * scaleX;
    const y = (point.y - originY) * scaleY;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
}

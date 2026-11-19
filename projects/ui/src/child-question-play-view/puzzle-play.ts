/** Helpers puzzle enfant — même magnétisme / découpe que l'éditeur teacher. */

export const PUZZLE_MAGNET_DEFAULT = 0.08;
export const PUZZLE_MAGNET_MAX = 0.25;
const MAGNET_FLOOR_PX = 4;
const MAX_SIDE = 480;
const MIN_SPAN = 0.01;

export interface PuzzlePoint {
  x: number;
  y: number;
}

export interface PuzzleShape {
  shape: string;
  points: PuzzlePoint[];
  slotX?: number | null;
  slotY?: number | null;
}

export interface PuzzleFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clampPuzzleMagnet(value: number): number {
  if (!Number.isFinite(value)) {
    return PUZZLE_MAGNET_DEFAULT;
  }
  return Math.min(PUZZLE_MAGNET_MAX, Math.max(0, value));
}

export function puzzlePieceFrame(zone: PuzzleShape): PuzzleFrame {
  const points = zone.points ?? [];
  if (zone.shape === 'rect' && points.length >= 2) {
    const x = Math.min(points[0].x, points[1].x);
    const y = Math.min(points[0].y, points[1].y);
    return {
      x,
      y,
      width: Math.max(MIN_SPAN, Math.abs(points[1].x - points[0].x)),
      height: Math.max(MIN_SPAN, Math.abs(points[1].y - points[0].y)),
    };
  }
  if (zone.shape === 'ellipse' && points.length >= 2) {
    const cx = points[0].x;
    const cy = points[0].y;
    const rx = Math.max(MIN_SPAN, Math.abs(points[1].x - cx));
    const ry = Math.max(MIN_SPAN, Math.abs(points[1].y - cy));
    return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };
  }
  if (points.length === 0) {
    return { x: 0, y: 0, width: MIN_SPAN, height: MIN_SPAN };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(MIN_SPAN, Math.max(...xs) - x),
    height: Math.max(MIN_SPAN, Math.max(...ys) - y),
  };
}

/** Emplacement cible du coin haut-gauche (slot blanc ou cadre de découpe). */
export function puzzlePieceHome(zone: PuzzleShape, boardMode: string | undefined): PuzzleFrame {
  const frame = puzzlePieceFrame(zone);
  if (boardMode === 'blanc' && zone.slotX != null && zone.slotY != null) {
    return { x: zone.slotX, y: zone.slotY, width: frame.width, height: frame.height };
  }
  return frame;
}

export function magnetizedPosition(
  raw: PuzzlePoint,
  home: PuzzlePoint,
  magnet: number,
  bounds: { width: number; height: number },
): { x: number; y: number; snapped: boolean } {
  const width = bounds.width > 0 ? bounds.width : 1;
  const height = bounds.height > 0 ? bounds.height : 1;
  const reach = Math.max(clampPuzzleMagnet(magnet) * width, MAGNET_FLOOR_PX);
  const dx = (raw.x - home.x) * width;
  const dy = (raw.y - home.y) * height;
  if (Math.hypot(dx, dy) <= reach) {
    return { x: home.x, y: home.y, snapped: true };
  }
  return { x: raw.x, y: raw.y, snapped: false };
}

export function placeOnImage(
  raw: PuzzlePoint,
  frame: PuzzleFrame,
  magnet: number,
  bounds: { width: number; height: number },
): PuzzlePoint | null {
  const spot = magnetizedPosition(raw, frame, magnet, bounds);
  const onImage =
    spot.x < 1 && spot.y < 1 && spot.x + frame.width > 0 && spot.y + frame.height > 0;
  if (!onImage) {
    return null;
  }
  return { x: spot.x, y: spot.y };
}

export function withinPuzzleMagnet(
  x: number,
  y: number,
  home: PuzzlePoint,
  magnet: number,
  bounds: { width: number; height: number } = { width: 1000, height: 1000 },
): boolean {
  return magnetizedPosition({ x, y }, home, magnet, bounds).snapped;
}

export function cutPuzzlePiece(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  zone: PuzzleShape,
): string {
  const frame = puzzlePieceFrame(zone);
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

export function punchPuzzlePieces(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  zones: PuzzleShape[],
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
  zone: PuzzleShape,
  originX: number,
  originY: number,
  scaleX: number,
  scaleY: number,
): void {
  const points = zone.points ?? [];
  ctx.beginPath();
  if (zone.shape === 'rect' && points.length >= 2) {
    const x = Math.min(points[0].x, points[1].x);
    const y = Math.min(points[0].y, points[1].y);
    const width = Math.abs(points[1].x - points[0].x);
    const height = Math.abs(points[1].y - points[0].y);
    ctx.rect((x - originX) * scaleX, (y - originY) * scaleY, width * scaleX, height * scaleY);
    return;
  }
  if (zone.shape === 'ellipse' && points.length >= 2) {
    const cx = points[0].x;
    const cy = points[0].y;
    const rx = Math.abs(points[1].x - cx);
    const ry = Math.abs(points[1].y - cy);
    ctx.ellipse(
      (cx - originX) * scaleX,
      (cy - originY) * scaleY,
      Math.max(1, rx * scaleX),
      Math.max(1, ry * scaleY),
      0,
      0,
      Math.PI * 2,
    );
    return;
  }
  points.forEach((point, index) => {
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

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = src;
  });
}

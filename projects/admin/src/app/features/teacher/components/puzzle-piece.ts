import { ClickZone, ellipseBox, pieceFrame, rectangleBox } from './click-zone';

const MAX_SIDE = 480;

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

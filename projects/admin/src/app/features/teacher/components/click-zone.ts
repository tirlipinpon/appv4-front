/** Zone dessinée sur une image, en proportion du dessin (SCRUM-181). */

export type ClickShape = 'polygon' | 'rect' | 'ellipse';

export interface ClickPoint {
  x: number;
  y: number;
}

export interface ClickZone {
  label: string;
  correct: boolean;
  shape: ClickShape;
  points: ClickPoint[];
}

const MIN_SPAN = 0.02;

export function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/** Retire un point du tracé en cours, sans toucher une zone déjà fermée. */
export function dropDraftPoint(points: ClickPoint[], index: number): ClickPoint[] {
  if (index < 0 || index >= points.length) {
    return points;
  }
  return points.filter((_, current) => current !== index);
}

/** Vrai si ce clic retombe sur le premier point : la zone peut se fermer. */
export function closesDraft(draft: ClickPoint[], point: ClickPoint): boolean {
  const first = draft[0];
  if (!first || draft.length < 3) {
    return false;
  }
  return Math.hypot(point.x - first.x, point.y - first.y) <= 0.03;
}

/** Convertit un clic écran en point collé à l'image, entre 0 et 1. */
export function relativePoint(
  bounds: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): ClickPoint {
  const width = bounds.width > 0 ? bounds.width : 1;
  const height = bounds.height > 0 ? bounds.height : 1;
  return {
    x: clamp01((clientX - bounds.left) / width),
    y: clamp01((clientY - bounds.top) / height),
  };
}

export function polygonAttribute(points: ClickPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function rectangleBox(points: ClickPoint[]): { x: number; y: number; width: number; height: number } {
  const first = points[0] ?? { x: 0.25, y: 0.25 };
  const second = points[1] ?? { x: 0.75, y: 0.75 };
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  return {
    x,
    y,
    width: Math.abs(second.x - first.x),
    height: Math.abs(second.y - first.y),
  };
}

export function ellipseBox(points: ClickPoint[]): { cx: number; cy: number; rx: number; ry: number } {
  const center = points[0] ?? { x: 0.5, y: 0.5 };
  const edge = points[1] ?? { x: center.x + 0.2, y: center.y + 0.15 };
  return {
    cx: center.x,
    cy: center.y,
    rx: Math.max(MIN_SPAN, edge.x - center.x),
    ry: Math.max(MIN_SPAN, edge.y - center.y),
  };
}

/** Poignées affichées sur la forme. Elles suivent l'image parce qu'elles sont en proportion. */
export function handles(zone: ClickZone): ClickPoint[] {
  if (zone.shape === 'rect') {
    const box = rectangleBox(zone.points);
    return [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
      { x: box.x, y: box.y + box.height },
    ];
  }
  if (zone.shape === 'ellipse') {
    const box = ellipseBox(zone.points);
    return [
      { x: box.cx, y: box.cy },
      { x: box.cx + box.rx, y: box.cy },
      { x: box.cx, y: box.cy + box.ry },
    ];
  }
  return zone.points;
}

/** Déplace toute la forme, sans la déformer, en la gardant sur l'image. */
export function translateZone(zone: ClickZone, dx: number, dy: number): ClickZone {
  if (zone.shape === 'ellipse') {
    const box = ellipseBox(zone.points);
    return {
      ...zone,
      points: fitEllipse(
        { x: box.cx + dx, y: box.cy + dy },
        { x: box.cx + box.rx + dx, y: box.cy + box.ry + dy },
      ),
    };
  }
  const shift = boundedShift(zone.points, dx, dy);
  return {
    ...zone,
    points: zone.points.map((point) => ({
      x: point.x + shift.dx,
      y: point.y + shift.dy,
    })),
  };
}

export function moveHandle(zone: ClickZone, handle: number, raw: ClickPoint): ClickZone {
  const point = { x: clamp01(raw.x), y: clamp01(raw.y) };
  if (zone.shape === 'polygon') {
    return {
      ...zone,
      points: zone.points.map((current, index) => (index === handle ? point : current)),
    };
  }
  if (zone.shape === 'rect') {
    return { ...zone, points: moveRectangle(zone.points, handle, point) };
  }
  return { ...zone, points: moveEllipse(zone.points, handle, point) };
}

export function defaultRectangle(): ClickZone {
  return {
    label: '',
    correct: true,
    shape: 'rect',
    points: [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.75 },
    ],
  };
}

export function defaultEllipse(): ClickZone {
  return {
    label: '',
    correct: true,
    shape: 'ellipse',
    points: [
      { x: 0.5, y: 0.5 },
      { x: 0.72, y: 0.66 },
    ],
  };
}

export function changeShape(zone: ClickZone, shape: ClickShape): ClickZone {
  if (zone.shape === shape) {
    return zone;
  }
  if (shape === 'rect') {
    const box = span(zone);
    return { ...zone, shape, points: [{ x: box.x, y: box.y }, { x: box.x + box.width, y: box.y + box.height }] };
  }
  if (shape === 'ellipse') {
    const box = span(zone);
    const cx = clamp01(box.x + box.width / 2);
    const cy = clamp01(box.y + box.height / 2);
    return {
      ...zone,
      shape,
      points: fitEllipse({ x: cx, y: cy }, { x: cx + box.width / 2, y: cy + box.height / 2 }),
    };
  }
  const box = span(zone);
  return {
    ...zone,
    shape: 'polygon',
    points: [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
      { x: box.x, y: box.y + box.height },
    ],
  };
}

export function appendPoint(zone: ClickZone, point: ClickPoint): ClickZone {
  if (zone.shape !== 'polygon' || zone.points.length >= 24) {
    return zone;
  }
  return { ...zone, points: [...zone.points, { x: clamp01(point.x), y: clamp01(point.y) }] };
}

export function removePoint(zone: ClickZone, index: number): ClickZone {
  if (zone.shape !== 'polygon' || zone.points.length <= 3) {
    return zone;
  }
  return { ...zone, points: zone.points.filter((_, current) => current !== index) };
}

function moveRectangle(points: ClickPoint[], handle: number, point: ClickPoint): ClickPoint[] {
  const box = rectangleBox(points);
  let x1 = box.x;
  let y1 = box.y;
  let x2 = box.x + box.width;
  let y2 = box.y + box.height;
  if (handle === 0) {
    x1 = point.x;
    y1 = point.y;
  } else if (handle === 1) {
    x2 = point.x;
    y1 = point.y;
  } else if (handle === 2) {
    x2 = point.x;
    y2 = point.y;
  } else {
    x1 = point.x;
    y2 = point.y;
  }
  if (Math.abs(x2 - x1) < MIN_SPAN) {
    x2 = x1 + (x2 >= x1 ? MIN_SPAN : -MIN_SPAN);
  }
  if (Math.abs(y2 - y1) < MIN_SPAN) {
    y2 = y1 + (y2 >= y1 ? MIN_SPAN : -MIN_SPAN);
  }
  return [
    { x: clamp01(Math.min(x1, x2)), y: clamp01(Math.min(y1, y2)) },
    { x: clamp01(Math.max(x1, x2)), y: clamp01(Math.max(y1, y2)) },
  ];
}

function moveEllipse(points: ClickPoint[], handle: number, point: ClickPoint): ClickPoint[] {
  const box = ellipseBox(points);
  if (handle === 0) {
    const dx = point.x - box.cx;
    const dy = point.y - box.cy;
    const edge = points[1] ?? { x: box.cx + box.rx, y: box.cy + box.ry };
    return fitEllipse(point, { x: edge.x + dx, y: edge.y + dy });
  }
  const center = points[0] ?? { x: box.cx, y: box.cy };
  const edge = points[1] ?? { x: box.cx + box.rx, y: box.cy + box.ry };
  if (handle === 1) {
    return fitEllipse(center, { x: point.x, y: edge.y });
  }
  return fitEllipse(center, { x: edge.x, y: point.y });
}

function fitEllipse(center: ClickPoint, edge: ClickPoint): ClickPoint[] {
  let rx = Math.max(MIN_SPAN, edge.x - center.x);
  let ry = Math.max(MIN_SPAN, edge.y - center.y);
  let cx = clamp01(center.x);
  let cy = clamp01(center.y);
  if (rx * 2 > 1) {
    rx = 0.5;
  }
  if (ry * 2 > 1) {
    ry = 0.5;
  }
  cx = Math.min(Math.max(cx, rx), 1 - rx);
  cy = Math.min(Math.max(cy, ry), 1 - ry);
  return [
    { x: cx, y: cy },
    { x: cx + rx, y: cy + ry },
  ];
}

function span(zone: ClickZone): { x: number; y: number; width: number; height: number } {
  if (zone.shape === 'rect') {
    const box = rectangleBox(zone.points);
    return wideEnough(box.x, box.y, box.width, box.height);
  }
  if (zone.shape === 'ellipse') {
    const box = ellipseBox(zone.points);
    return wideEnough(box.cx - box.rx, box.cy - box.ry, box.rx * 2, box.ry * 2);
  }
  const xs = zone.points.map((point) => point.x);
  const ys = zone.points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return wideEnough(x, y, Math.max(...xs) - x, Math.max(...ys) - y);
}

function boundedShift(points: ClickPoint[], dx: number, dy: number): { dx: number; dy: number } {
  if (points.length === 0) {
    return { dx: 0, dy: 0 };
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let nextDx = dx;
  let nextDy = dy;
  if (minX + nextDx < 0) {
    nextDx = -minX;
  }
  if (maxX + nextDx > 1) {
    nextDx = 1 - maxX;
  }
  if (minY + nextDy < 0) {
    nextDy = -minY;
  }
  if (maxY + nextDy > 1) {
    nextDy = 1 - maxY;
  }
  return { dx: nextDx, dy: nextDy };
}

export function pieceFrame(zone: ClickZone): { x: number; y: number; width: number; height: number } {
  if (zone.shape === 'rect') {
    return rectangleBox(zone.points);
  }
  if (zone.shape === 'ellipse') {
    const box = ellipseBox(zone.points);
    return { x: box.cx - box.rx, y: box.cy - box.ry, width: box.rx * 2, height: box.ry * 2 };
  }
  const xs = zone.points.map((point) => point.x);
  const ys = zone.points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(MIN_SPAN, Math.max(...xs) - x),
    height: Math.max(MIN_SPAN, Math.max(...ys) - y),
  };
}

function wideEnough(x: number, y: number, width: number, height: number): { x: number; y: number; width: number; height: number } {
  const nextWidth = width < MIN_SPAN ? 0.5 : width;
  const nextHeight = height < MIN_SPAN ? 0.5 : height;
  const nextX = width < MIN_SPAN ? 0.25 : x;
  const nextY = height < MIN_SPAN ? 0.25 : y;
  return { x: nextX, y: nextY, width: nextWidth, height: nextHeight };
}

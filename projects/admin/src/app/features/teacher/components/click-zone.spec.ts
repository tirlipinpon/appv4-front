import {
  closesDraft,
  dropDraftPoint,
  moveHandle,
  pieceFrame,
  relativePoint,
  translateZone,
  zoneContains,
} from './click-zone';

describe('click zones stay on the image', () => {
  it('maps a click to the same part of the drawing when the box changes size', () => {
    const wide = relativePoint({ left: 0, top: 0, width: 800, height: 400 }, 400, 200);
    const phone = relativePoint({ left: 12, top: 40, width: 200, height: 100 }, 112, 90);

    expect(wide).toEqual({ x: 0.5, y: 0.5 });
    expect(phone).toEqual({ x: 0.5, y: 0.5 });
  });

  it('keeps a rectangle on the image when a corner is dragged', () => {
    const moved = moveHandle(
      {
        label: 'nuage',
        correct: false,
        shape: 'rect',
        points: [
          { x: 0.2, y: 0.2 },
          { x: 0.6, y: 0.5 },
        ],
      },
      2,
      { x: 1.4, y: -0.2 },
    );

    expect(moved.points[0]).toEqual({ x: 0.2, y: 0 });
    expect(moved.points[1]).toEqual({ x: 1, y: 0.2 });
  });

  it('closes a draft when the click returns to the first point', () => {
    const draft = [
      { x: 0.2, y: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ];

    expect(closesDraft(draft, { x: 0.21, y: 0.2 })).toBeTrue();
    expect(closesDraft(draft, { x: 0.5, y: 0.2 })).toBeFalse();
    expect(closesDraft(draft.slice(0, 2), { x: 0.2, y: 0.2 })).toBeFalse();
  });

  it('slides a whole shape and stops it at the edge of the image', () => {
    const zone = {
      label: 'tony',
      correct: true,
      shape: 'polygon' as const,
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.4, y: 0.2 },
        { x: 0.2, y: 0.5 },
      ],
    };

    const moved = translateZone(zone, 0.1, 0.1).points;
    expect(moved[0].x).toBeCloseTo(0.2);
    expect(moved[0].y).toBeCloseTo(0.3);
    expect(moved[1].x).toBeCloseTo(0.5);
    expect(moved[2].y).toBeCloseTo(0.6);
    expect(translateZone(zone, -1, 0).points[0].x).toBeCloseTo(0);
  });

  it('drops one draft point and leaves the others', () => {
    const points = [
      { x: 0.1, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ];

    expect(dropDraftPoint(points, 0)).toEqual([{ x: 0.4, y: 0.5 }]);
    expect(dropDraftPoint(points, 5)).toEqual(points);
  });

  it('keeps a piece on the same fraction of the image', () => {
    const frame = pieceFrame({
      label: 'ciel',
      correct: true,
      shape: 'rect',
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.5, y: 0.6 },
      ],
    });

    expect(frame.x).toBeCloseTo(0.1);
    expect(frame.y).toBeCloseTo(0.2);
    expect(frame.width).toBeCloseTo(0.4);
    expect(frame.height).toBeCloseTo(0.4);
  });

  it('finds a click inside a shape and ignores a click outside', () => {
    const rect = {
      label: 'nuage',
      correct: false,
      shape: 'rect' as const,
      points: [
        { x: 0.5, y: 0.5 },
        { x: 0.8, y: 0.8 },
      ],
    };
    const ellipse = {
      label: 'soleil',
      correct: true,
      shape: 'ellipse' as const,
      points: [
        { x: 0.2, y: 0.2 },
        { x: 0.35, y: 0.35 },
      ],
    };

    expect(zoneContains(rect, { x: 0.6, y: 0.6 })).toBe(true);
    expect(zoneContains(rect, { x: 0.2, y: 0.2 })).toBe(false);
    expect(zoneContains(ellipse, { x: 0.2, y: 0.2 })).toBe(true);
    expect(zoneContains(ellipse, { x: 0.9, y: 0.9 })).toBe(false);
  });
});

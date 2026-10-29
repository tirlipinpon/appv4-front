import { closesDraft, dropDraftPoint, moveHandle, relativePoint } from './click-zone';

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

  it('drops one draft point and leaves the others', () => {
    const points = [
      { x: 0.1, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ];

    expect(dropDraftPoint(points, 0)).toEqual([{ x: 0.4, y: 0.5 }]);
    expect(dropDraftPoint(points, 5)).toEqual(points);
  });
});

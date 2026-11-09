import { cutPiece, magnetizedPosition, placeOnImage, punchPieces } from './puzzle-piece';

describe('puzzle piece crop', () => {
  it('keeps the pixels that sit inside the shape', async () => {
    const source = document.createElement('canvas');
    source.width = 100;
    source.height = 50;
    const paint = source.getContext('2d');
    if (!paint) {
      fail('canvas indisponible');
      return;
    }
    paint.fillStyle = '#ff0000';
    paint.fillRect(0, 0, 50, 50);
    paint.fillStyle = '#0000ff';
    paint.fillRect(50, 0, 50, 50);

    const image = await load(source.toDataURL('image/png'));
    const url = cutPiece(image, image.naturalWidth, image.naturalHeight, {
      label: 'gauche',
      correct: true,
      shape: 'rect',
      points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 1 },
      ],
    });
    const piece = await load(url);
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) {
      fail('canvas indisponible');
      return;
    }
    ctx.canvas.width = piece.naturalWidth;
    ctx.canvas.height = piece.naturalHeight;
    ctx.drawImage(piece, 0, 0);
    const pixel = ctx.getImageData(Math.floor(piece.naturalWidth / 2), Math.floor(piece.naturalHeight / 2), 1, 1).data;

    expect(piece.naturalWidth).toBe(50);
    expect(piece.naturalHeight).toBe(50);
    expect(pixel[0]).toBeGreaterThan(200);
    expect(pixel[2]).toBeLessThan(30);
  });

  it('leaves the cut empty on the source image', async () => {
    const source = document.createElement('canvas');
    source.width = 100;
    source.height = 50;
    const paint = source.getContext('2d');
    if (!paint) {
      fail('canvas indisponible');
      return;
    }
    paint.fillStyle = '#ff0000';
    paint.fillRect(0, 0, 50, 50);
    paint.fillStyle = '#0000ff';
    paint.fillRect(50, 0, 50, 50);

    const image = await load(source.toDataURL('image/png'));
    const url = punchPieces(image, image.naturalWidth, image.naturalHeight, [
      {
        label: 'gauche',
        correct: true,
        shape: 'rect',
        points: [
          { x: 0, y: 0 },
          { x: 0.5, y: 1 },
        ],
      },
    ]);
    const holed = await load(url);
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) {
      fail('canvas indisponible');
      return;
    }
    ctx.canvas.width = holed.naturalWidth;
    ctx.canvas.height = holed.naturalHeight;
    ctx.drawImage(holed, 0, 0);
    const hole = ctx.getImageData(25, 25, 1, 1).data;
    const kept = ctx.getImageData(75, 25, 1, 1).data;

    expect(hole[3]).toBe(0);
    expect(kept[2]).toBeGreaterThan(200);
    expect(kept[3]).toBe(255);
  });

  it('sticks a piece on its cut when the drop is inside the magnet', () => {
    const home = { x: 0.2, y: 0.3 };
    const raw = { x: 0.2 + 40 / 640, y: 0.3 };
    const result = magnetizedPosition(raw, home, 0.08, { width: 640, height: 400 });

    expect(result.snapped).toBe(true);
    expect(result.x).toBe(0.2);
    expect(result.y).toBe(0.3);
  });

  it('leaves the piece where it was dropped when it is too far', () => {
    const home = { x: 0.2, y: 0.3 };
    const result = magnetizedPosition({ x: 0.6, y: 0.3 }, home, 0.08, { width: 640, height: 400 });

    expect(result.snapped).toBe(false);
    expect(result.x).toBe(0.6);
  });

  it('uses the image height so a vertical miss is not ignored', () => {
    const home = { x: 0.2, y: 0.3 };
    const result = magnetizedPosition({ x: 0.2, y: 0.3 + 80 / 400 }, home, 0.05, { width: 640, height: 400 });

    expect(result.snapped).toBe(false);
  });

  it('still locks a perfect drop when the magnet is zero', () => {
    const home = { x: 0.2, y: 0.3 };
    const near = magnetizedPosition({ x: 0.2 + 2 / 640, y: 0.3 }, home, 0, { width: 640, height: 400 });
    const far = magnetizedPosition({ x: 0.2 + 20 / 640, y: 0.3 }, home, 0, { width: 640, height: 400 });

    expect(near.snapped).toBe(true);
    expect(far.snapped).toBe(false);
  });

  it('keeps a piece where it was dropped on the image', () => {
    const frame = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    const result = placeOnImage({ x: 0.5, y: 0.1 }, frame, 0.08, { width: 640, height: 400 });

    expect(result).toEqual({ x: 0.5, y: 0.1 });
  });

  it('sends a piece back only when it is dropped fully off the image', () => {
    const frame = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    const off = placeOnImage({ x: 0.2, y: 1.4 }, frame, 0.08, { width: 640, height: 400 });
    const touching = placeOnImage({ x: 0.5, y: 0.9 }, frame, 0.08, { width: 640, height: 400 });

    expect(off).toBeNull();
    expect(touching).toEqual({ x: 0.5, y: 0.9 });
  });

  it('still locks onto the cut when the drop on the image is close enough', () => {
    const frame = { x: 0.2, y: 0.3, width: 0.25, height: 0.25 };
    const result = placeOnImage(
      { x: 0.2 + 40 / 640, y: 0.3 },
      frame,
      0.08,
      { width: 640, height: 400 },
    );

    expect(result).toEqual({ x: 0.2, y: 0.3 });
  });
});

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image illisible'));
    image.src = url;
  });
}

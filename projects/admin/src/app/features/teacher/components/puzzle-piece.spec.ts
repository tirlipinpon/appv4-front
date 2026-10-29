import { cutPiece } from './puzzle-piece';

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
});

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image illisible'));
    image.src = url;
  });
}

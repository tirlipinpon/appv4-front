import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_SIDE,
  PHOTO_NOT_IMAGE,
  PHOTO_TOO_LARGE,
  acceptCroppedWebp,
  preparePhoto,
} from './child-photo';

describe('photo enfant', () => {
  it('réduit le grand côté à 1600 px et convertit en WebP', async () => {
    const prepared = await preparePhoto(await canvasFile(2000, 1000, 'image/png'));
    expect(prepared.width).toBe(MAX_PHOTO_SIDE);
    expect(prepared.height).toBe(800);
    expect(prepared.dataUrl.startsWith('data:image/webp')).toBeTrue();
  });

  it('n’agrandit pas une image déjà petite', async () => {
    const prepared = await preparePhoto(await canvasFile(400, 300, 'image/png'));
    expect(prepared.width).toBe(400);
    expect(prepared.height).toBe(300);
  });

  it('transforme un GIF en WebP fixe', async () => {
    const prepared = await preparePhoto(gifFile());
    expect(prepared.dataUrl.startsWith('data:image/webp')).toBeTrue();
    expect(Math.max(prepared.width, prepared.height)).toBeLessThanOrEqual(MAX_PHOTO_SIDE);
  });

  it('conserve un pixel transparent', async () => {
    const prepared = await preparePhoto(await transparentPng());
    const pixel = await pixelAt(prepared.dataUrl, 1, 1);
    expect(pixel[3]).toBe(0);
  });

  it('retient un WebP sous 5 Mo, et refuse le reste', () => {
    const accepted = acceptCroppedWebp('data:image/webp;base64,QUJD');
    expect(accepted.contentType).toBe('image/webp');
    expect(accepted.base64).toBe('QUJD');
    expect(accepted.previewUrl).toContain('image/webp');

    expect(() => acceptCroppedWebp('data:image/png;base64,QUJD')).toThrowError(PHOTO_NOT_IMAGE);
    const heavy = 'A'.repeat(Math.ceil((MAX_PHOTO_BYTES + 1) * 4 / 3));
    expect(() => acceptCroppedWebp(`data:image/webp;base64,${heavy}`)).toThrowError(PHOTO_TOO_LARGE);
  });

  it('refuse un fichier qui n’est pas une image, ou qui dépasse 5 Mo, sans le réduire', async () => {
    const pdf = new File(['%PDF'], 'note.pdf', { type: 'application/pdf' });
    await expectAsync(preparePhoto(pdf)).toBeRejectedWithError(PHOTO_NOT_IMAGE);

    const heavy = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    await expectAsync(preparePhoto(heavy)).toBeRejectedWithError(PHOTO_TOO_LARGE);

    const broken = new File([new Uint8Array([1, 2, 3])], 'broken.png', { type: 'image/png' });
    await expectAsync(preparePhoto(broken)).toBeRejectedWithError(PHOTO_NOT_IMAGE);
  });
});

function canvasFile(width: number, height: number, type: string): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('canvas');
  }
  ctx.fillStyle = '#36c';
  ctx.fillRect(0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('blob'));
        return;
      }
      resolve(new File([blob], 'photo', { type }));
    }, type);
  });
}

function transparentPng(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('canvas');
  }
  ctx.clearRect(0, 0, 2, 2);
  ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
  ctx.fillRect(0, 0, 1, 1);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('blob'));
        return;
      }
      resolve(new File([blob], 'photo.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

function gifFile(): File {
  const bytes = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (char) =>
    char.charCodeAt(0),
  );
  return new File([bytes], 'photo.gif', { type: 'image/gif' });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = src;
  });
}

async function pixelAt(src: string, x: number, y: number): Promise<Uint8ClampedArray> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('canvas');
  }
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(x, y, 1, 1).data;
}

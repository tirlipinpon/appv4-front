import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import type { ParentChildResponse, ParentSchoolOption } from '../../core/api/api-models';
import { IMAGE_REQUIRED, PIN_FORMAT, PIN_MISMATCH } from './child-entry';
import { ParentChildrenPage } from './parent-children.page';

const childrenUrl = 'http://localhost:8080/api/int/parent/children';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';
const accountUrl = 'http://localhost:8080/api/int/auth/me';

function child(partial: ParentChildResponse): ParentChildResponse {
  return partial;
}

const lea = child({
  id: 1,
  firstName: 'Léa',
  lastName: 'Martin',
  sex: 'FILLE',
  links: [{ otherChildId: 2, label: 'Frère' }],
});
const noah = child({
  id: 2,
  firstName: 'Noah',
  lastName: 'Martin',
  sex: 'GARCON',
  links: [{ otherChildId: 1, label: 'Sœur' }],
});
const camille = child({
  id: 3,
  firstName: 'Camille',
  lastName: 'Martin',
  sex: 'NON_GENRE',
  links: [],
});

describe('ParentChildrenPage liens', () => {
  let fixture: ComponentFixture<ParentChildrenPage>;
  let page: ParentChildrenPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentChildrenPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParentChildrenPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(childrenUrl).flush({ children: [lea, noah, camille], schools: [], curricula: [] });
    http.expectOne(spacesUrl).flush({ roles: ['parent'], teacherRequest: 'none' });
    http.expectOne(accountUrl).flush({ displayName: 'Tony' });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('propose les mots du garçon choisi, et vide Sœur quand on passe de Léa à Noah', () => {
    page.openForm();
    page.onLinkTarget(1);
    page.link.set('SOEUR');

    page.onLinkTarget(2);
    fixture.detectChanges();

    expect(page.relationChoices().map((item) => item.label)).toEqual([
      'Frère',
      'Demi-frère',
      'Jumeau',
      'Cousin',
    ]);
    expect(page.link()).toBe('');

    page.sex.set('GARCON');
    page.save();
    expect(page.error()).toBe('Choisis le lien avec Noah.');
    http.expectNone(childrenUrl);
  });

  it('coche le mot déjà enregistré, selon le sexe de l’autre enfant', () => {
    page.edit(lea);
    page.onLinkTarget(2);
    expect(page.link()).toBe('FRERE');

    page.edit(noah);
    page.onLinkTarget(1);
    expect(page.relationChoices().map((item) => item.label)).toEqual([
      'Sœur',
      'Demi-sœur',
      'Jumelle',
      'Cousine',
    ]);
    expect(page.link()).toBe('SOEUR');
  });

  it('affiche la photo déjà enregistrée dans Modifier, sans la renvoyer', async () => {
    const url = 'blob:http://localhost/photo-lea';
    page.photos.set({ 1: url });
    page.edit({ ...lea, hasPhoto: true });
    expect(page.photoPreview()).toBe(url);
    expect(page.photoBase64()).toBeNull();

    await page.onPhoto(fileEvent(await squarePng(40)));
    expect(page.photoPreview()).toBeNull();
    page.cancelCrop();
    expect(page.photoPreview()).toBe(url);
    expect(page.keepPhoto()).toBeTrue();
    expect(page.photoBase64()).toBeNull();
  });

  it('propose les quatre mots neutres pour un enfant non genré', () => {
    page.openForm();
    page.onLinkTarget(3);
    expect(page.relationChoices().map((item) => item.label)).toEqual([
      'Frère/sœur',
      'Demi-frère/sœur',
      'Jumeau/jumelle',
      'Cousin/cousine',
    ]);
  });

  it('ignore les lettres du code et de l’âge, et n’envoie rien si le code ou l’âge est refusé', () => {
    fill(page);
    const pin = inputEvent('48a1');
    page.onPinInput(pin);
    expect(page.pin()).toBe('481');
    expect((pin.target as HTMLInputElement).value).toBe('481');

    const age = inputEvent('7 ans');
    page.onAgeInput(age);
    expect(page.age()).toBe('7');
    expect((age.target as HTMLInputElement).value).toBe('7');
    page.onAgeInput(inputEvent('sept'));
    expect(page.age()).toBe('');

    page.age.set('7');
    page.pin.set('4821');
    page.pinConfirmation.set('4822');
    page.save();
    expect(page.error()).toBe(PIN_MISMATCH);
    http.expectNone(childrenUrl);

    page.pin.set('482');
    page.pinConfirmation.set('482');
    page.save();
    expect(page.error()).toBe(PIN_FORMAT);
    http.expectNone(childrenUrl);

    page.onPinInput(inputEvent('4821'));
    page.onPinConfirmationInput(inputEvent('4821'));
    expect(page.error()).toBeNull();

    page.age.set('1');
    page.save();
    expect(page.error()).toContain('entre 2 et 18');
    http.expectNone(childrenUrl);

    page.age.set('');
    page.avatarCode.set(null);
    page.pin.set('4821');
    page.pinConfirmation.set('4821');
    page.save();
    expect(page.error()).toContain('entre 2 et 18');

    page.age.set('7');
    page.save();
    expect(page.error()).toBe(IMAGE_REQUIRED);
    http.expectNone(childrenUrl);
  });

  it('n’a qu’un champ école, et les suggestions attendent deux lettres puis la pause', fakeAsync(() => {
    page.schools.set(schools);
    page.openForm();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Filtrer les écoles');
    const school = fixture.nativeElement.querySelector('input[name="school"]') as HTMLInputElement;
    expect(school.disabled).toBeTrue();

    page.onCountry('France');
    fixture.detectChanges();
    expect(school.disabled).toBeFalse();
    page.onSchoolText('L');
    tick(400);
    expect(page.schoolSuggestions()).toEqual([]);

    page.onSchoolText('ly');
    tick(200);
    page.onSchoolText('lyc');
    tick(299);
    expect(page.schoolSuggestions()).toEqual([]);
    tick(1);
    expect(page.schoolSuggestions().map((item) => item.id)).toEqual([1]);

    page.onSchoolPicked(schools[0]);
    expect(page.schoolId()).toBe(1);
    expect(page.gradeOptions()).toEqual(['6e', '5e']);
    expect(page.schoolSuggestions()).toEqual([]);

    page.onSchoolText('');
    expect(page.schoolId()).toBeNull();

    page.onSchoolPicked(schools[0]);
    page.onCountry('Belgique');
    expect(page.schoolId()).toBeNull();
    expect(page.schoolText()).toBe('');
    expect(page.grade()).toBeNull();
    page.onSchoolText('éc');
    tick(300);
    expect(page.schoolSuggestions().map((item) => item.id)).toEqual([2]);
  }));

  it('envoie le WebP recadré, et n’ouvre pas le cadre si le fichier est refusé', async () => {
    fill(page);
    const pdf = new File(['bonjour'], 'note.pdf', { type: 'application/pdf' });
    await page.onPhoto(fileEvent(pdf));
    expect(page.error()).toBe("Le fichier n'est pas une image.");
    expect(page.cropOpen()).toBeFalse();

    const heavy = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
    await page.onPhoto(fileEvent(heavy));
    expect(page.error()).toBe("L'image dépasse 5 Mo.");
    expect(page.photoBase64()).toBeNull();

    await page.onPhoto(fileEvent(await squarePng(1800)));
    expect(page.cropOpen()).toBeTrue();
    expect(await longestSide(page.cropSourceUrl())).toBe(1600);
    expect(page.photoBase64()).toBeNull();

    page.cancelCrop();
    expect(page.cropOpen()).toBeFalse();
    expect(page.photoPreview()).toBeNull();
    page.pin.set('4821');
    page.pinConfirmation.set('4821');
    page.save();
    expect(page.error()).toBe(IMAGE_REQUIRED);
    http.expectNone(childrenUrl);

    await page.onPhoto(fileEvent(await squarePng(80)));
    expect(await longestSide(page.cropSourceUrl())).toBe(80);
    fixture.detectChanges();
    await waitForCrop(page, fixture);
    expect(page.cropOpen()).toBeFalse();
    expect(page.photoContentType()).toBe('image/webp');
    expect(page.photoPreview()).toContain('image/webp');
    const preview = await loadImage(page.photoPreview() ?? '');
    expect(preview.naturalWidth).toBe(preview.naturalHeight);
    page.chooseAvatar('fox');
    expect(page.photoPreview()).toBeNull();
    expect(page.avatarCode()).toBe('fox');
  });
});

const schools: ParentSchoolOption[] = [
  { id: 1, name: 'Lycée Victor Hugo', country: 'France', grades: ['6e', '5e'] },
  { id: 2, name: 'École communale', country: 'Belgique', grades: ['1re primaire'] },
];

function fill(page: ParentChildrenPage): void {
  page.openForm();
  page.firstName.set('Léa');
  page.lastName.set('Martin');
  page.sex.set('FILLE');
  page.age.set('7');
  page.country.set('France');
  page.grade.set('6e');
  page.avatarCode.set('fox');
}

function inputEvent(value: string): Event {
  const input = document.createElement('input');
  input.value = value;
  return { target: input } as unknown as Event;
}

function fileEvent(file: File): Event {
  const input = document.createElement('input');
  const list = {
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null),
  } as unknown as FileList;
  Object.defineProperty(input, 'files', { value: list });
  return { target: input } as unknown as Event;
}

function longestSide(src: string | null): Promise<number> {
  return loadImage(src ?? '').then((image) => Math.max(image.naturalWidth, image.naturalHeight));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = src;
  });
}

async function waitForCrop(page: ParentChildrenPage, fixture: ComponentFixture<ParentChildrenPage>): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt++) {
    fixture.detectChanges();
    page.confirmCrop();
    if (page.photoBase64()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Le recadrage n’est pas prêt.');
}

function squarePng(size: number): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('canvas');
  }
  ctx.fillStyle = '#c33';
  ctx.fillRect(0, 0, size, size);
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

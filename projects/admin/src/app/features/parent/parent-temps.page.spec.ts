import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../core/auth/auth.service';
import { ParentTempsPage } from './parent-temps.page';

const childrenUrl = 'http://localhost:8080/api/int/parent/children';

describe('ParentTempsPage', () => {
  let fixture: ComponentFixture<ParentTempsPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ParentTempsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    TestBed.inject(AuthService).setToken(parentToken());
    fixture = TestBed.createComponent(ParentTempsPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('ouvre le mois courant, le jour d’aujourd’hui, et reconnaît les espaces', () => {
    expect(menuLabels()).toEqual(['Accueil', 'Enfants', 'Profil', 'Matières', 'Humeur', 'Temps', 'Suivi']);

    http.expectOne(childrenUrl).flush({
      children: [
        { id: 2, firstName: 'Akira', lastName: 'Iris' },
        { id: 5, firstName: 'Nao', lastName: 'Iris' },
      ],
    });
    const month = http.expectOne(sejoursUrl(2));
    expect(month.request.params.keys().length).toBe(0);
    month.flush(november());
    flushHeader();
    fixture.detectChanges();

    expect(text('[data-testid="parent-temps-month"]')).toBe('novembre 2026');
    expect(text('[data-testid="parent-temps-child"]')).toContain('Akira');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-day-22"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-quiet-1"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-next"]')?.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-day-22"]')?.getAttribute('aria-current')).toBe(
      'date',
    );

    const detail = fixture.nativeElement.querySelector('[data-testid="parent-temps-detail"]') as HTMLElement;
    expect(detail.textContent).toContain('22 novembre 2026');
    expect(detail.textContent).toContain('7 min');
    const lines = [...detail.querySelectorAll('[data-testid="parent-temps-line"]')] as HTMLElement[];
    expect(lines.map((line) => line.getAttribute('data-space'))).toEqual(['accueil', 'question', 'profil']);
    expect(lines[0].querySelector('[data-testid="parent-temps-label"]')?.textContent).toBe('Accueil');
    expect(lines[0].textContent).toContain('6 min 45');
    expect(lines[1].querySelector('[data-testid="parent-temps-subject"]')?.textContent).toBe('Maths');

    const filter = fixture.nativeElement.querySelector('[data-testid="parent-temps-filter"]') as HTMLSelectElement;
    expect([...filter.options].map((option) => option.textContent?.trim())).toEqual([
      'Tout',
      'Accueil',
      'Questions',
      'Profil',
    ]);
    filter.value = 'question';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const filtered = [...fixture.nativeElement.querySelectorAll('[data-testid="parent-temps-line"]')] as HTMLElement[];
    expect(filtered.map((line) => line.getAttribute('data-space'))).toEqual(['question']);
    expect(filtered[0].querySelector('[data-testid="parent-temps-subject"]')?.textContent).toBe('Maths');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-duration"]')).toBeNull();
    filter.value = 'accueil';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(
      [...fixture.nativeElement.querySelectorAll('[data-testid="parent-temps-line"]')].map((line) =>
        (line as HTMLElement).getAttribute('data-space'),
      ),
    ).toEqual(['accueil']);
    filter.value = '';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="parent-temps-line"]').length).toBe(3);
    expect(text('[data-testid="parent-temps-duration"]')).toBe('7 min');
    const sort = fixture.nativeElement.querySelector('[data-testid="parent-temps-sort"]') as HTMLSelectElement;
    expect([...sort.options].map((option) => option.textContent?.trim())).toEqual([
      'Journée',
      'Croissant',
      'Décroissant',
    ]);
    sort.value = 'asc';
    sort.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(lineSpaces()).toEqual(['question', 'profil', 'accueil']);
    sort.value = 'desc';
    sort.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(lineSpaces()).toEqual(['accueil', 'profil', 'question']);
    (fixture.nativeElement.querySelector('[data-testid="parent-temps-day-21"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-testid="parent-temps-day-22"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[data-testid="parent-temps-sort"]') as HTMLSelectElement).value).toBe(
      '',
    );
    expect(lineSpaces()).toEqual(['accueil', 'question', 'profil']);
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-evolution"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-from"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-to"]')).not.toBeNull();
    const bar = fixture.nativeElement.querySelector('[data-testid="parent-temps-day-22"] .bar') as HTMLElement;
    expect([...bar.querySelectorAll('.seg')].map((seg) => seg.getAttribute('data-space'))).toEqual([
      'accueil',
      'question',
      'profil',
    ]);

    (fixture.nativeElement.querySelector('[data-testid="parent-temps-day-21"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-detail"]')?.textContent).toContain(
      '21 novembre 2026',
    );
    (fixture.nativeElement.querySelector('[data-testid="parent-temps-day-21"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-detail"]')?.textContent).toContain(
      '21 novembre 2026',
    );
  });

  it('ferme le détail en reculant, puis revient au mois courant avec l’enfant suivant', () => {
    http.expectOne(childrenUrl).flush({
      children: [
        { id: 2, firstName: 'Akira', lastName: 'Iris' },
        { id: 5, firstName: 'Nao', lastName: 'Iris' },
      ],
    });
    http.expectOne(sejoursUrl(2)).flush(november());
    flushHeader();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-testid="parent-temps-prev"]') as HTMLButtonElement).click();
    const october = http.expectOne(
      (req) => req.url === sejoursUrl(2) && req.params.get('year') === '2026' && req.params.get('month') === '10',
    );
    october.flush({
      monthLabel: 'octobre 2026',
      year: 2026,
      month: 10,
      currentMonth: false,
      journees: [],
    });
    fixture.detectChanges();

    expect(text('[data-testid="parent-temps-month"]')).toBe('octobre 2026');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-detail"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-quiet-1"]')).not.toBeNull();

    (fixture.nativeElement.querySelector('[data-testid="parent-temps-pick-5"]') as HTMLButtonElement).click();
    const nao = http.expectOne(sejoursUrl(5));
    expect(nao.request.params.keys().length).toBe(0);
    nao.flush({
      monthLabel: 'novembre 2026',
      year: 2026,
      month: 11,
      currentMonth: true,
      journees: [],
    });
    fixture.detectChanges();

    expect(text('[data-testid="parent-temps-child"]')).toContain('Nao');
    expect(text('[data-testid="parent-temps-month"]')).toBe('novembre 2026');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-detail"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('7 min');
  });

  it('reste vide sans enfant et sans exemple', () => {
    http.expectOne(childrenUrl).flush({ children: [] });
    http.expectNone((req) => req.url.includes('/sejours'));
    flushHeader();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-child"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-month"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('7 min');
  });

  it('affiche le message renvoyé quand l’enfant est introuvable', () => {
    http.expectOne(childrenUrl).flush({
      children: [{ id: 9, firstName: 'Lina', lastName: 'Or' }],
    });
    http.expectOne(sejoursUrl(9)).flush({ message: 'Cet enfant est introuvable.' }, { status: 404, statusText: 'Not Found' });
    flushHeader();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-error"]')?.textContent?.trim()).toBe(
      'Cet enfant est introuvable.',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-month"]')).toBeNull();
  });

  it('montre la phrase au-dessus du mois et sur le jour en cours', () => {
    openAkira(exceeded());

    expect(text('[data-testid="parent-temps-alert"]')).toBe('Plafond du jour dépassé.');
    expect(text('[data-testid="parent-temps-today-phrase"]')).toBe('Plafond du jour dépassé.');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-day-21"]')?.textContent).not.toContain(
      'Plafond du jour dépassé.',
    );
    expect((fixture.nativeElement.querySelector('[data-testid="parent-temps-limit"]') as HTMLInputElement).value).toBe(
      '30',
    );
  });

  it('garde la phrase au-dessus quand le mois affiché est passé', () => {
    openAkira({
      monthLabel: 'octobre 2026',
      year: 2026,
      month: 10,
      currentMonth: false,
      journees: [],
      plafond: {
        limitMinutes: 30,
        exceeded: true,
        message: 'Plafond du jour dépassé.',
        editable: true,
      },
    });

    expect(text('[data-testid="parent-temps-alert"]')).toBe('Plafond du jour dépassé.');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-today-phrase"]')).toBeNull();
  });

  it('laisse le parent en partage lire le plafond sans l’écrire', () => {
    openAkira({
      ...november(),
      plafond: {
        limitMinutes: 30,
        exceeded: false,
        message: '',
        editable: false,
      },
    });

    expect(text('[data-testid="parent-temps-limit"]')).toBe('30');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-save"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-clear"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-alert"]')).toBeNull();
  });

  it('enregistre le nouveau nombre et retire la phrase renvoyée vide', () => {
    openAkira(exceeded());
    const input = fixture.nativeElement.querySelector('[data-testid="parent-temps-limit"]') as HTMLInputElement;
    input.value = '31';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-testid="parent-temps-save"]') as HTMLButtonElement).click();

    const saved = http.expectOne((req) => req.method === 'PUT' && req.url === `${sejoursUrl(2)}/plafond`);
    expect(saved.request.body).toEqual({ limitMinutes: 31 });
    saved.flush({ limitMinutes: 31, exceeded: false, message: '', editable: true });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-today-phrase"]')).toBeNull();
    expect((fixture.nativeElement.querySelector('[data-testid="parent-temps-limit"]') as HTMLInputElement).value).toBe(
      '31',
    );
  });

  it('retire le plafond en envoyant un corps vide', () => {
    openAkira(exceeded());
    (fixture.nativeElement.querySelector('[data-testid="parent-temps-clear"]') as HTMLButtonElement).click();

    const cleared = http.expectOne((req) => req.method === 'PUT' && req.url === `${sejoursUrl(2)}/plafond`);
    expect(cleared.request.body).toEqual({});
    cleared.flush({ exceeded: false, message: '', editable: true });
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('[data-testid="parent-temps-limit"]') as HTMLInputElement).value).toBe(
      '',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-alert"]')).toBeNull();
  });

  it('affiche le refus de l’API et garde le plafond déjà montré', () => {
    openAkira(exceeded());
    const input = fixture.nativeElement.querySelector('[data-testid="parent-temps-limit"]') as HTMLInputElement;
    input.value = '0';
    input.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('[data-testid="parent-temps-save"]') as HTMLButtonElement).click();

    const refused = http.expectOne((req) => req.method === 'PUT' && req.url === `${sejoursUrl(2)}/plafond`);
    expect(refused.request.body).toEqual({ limitMinutes: 0 });
    refused.flush(
      { message: 'Le plafond est entre 1 et 960 minutes.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(text('[data-testid="parent-temps-error"]')).toBe('Le plafond est entre 1 et 960 minutes.');
    expect(text('[data-testid="parent-temps-alert"]')).toBe('Plafond du jour dépassé.');
    expect((fixture.nativeElement.querySelector('[data-testid="parent-temps-limit"]') as HTMLInputElement).value).toBe(
      '0',
    );
  });

  function openAkira(month: object): void {
    http.expectOne(childrenUrl).flush({
      children: [{ id: 2, firstName: 'Akira', lastName: 'Iris' }],
    });
    http.expectOne(sejoursUrl(2)).flush(month);
    flushHeader();
    fixture.detectChanges();
  }

  function menuLabels(): string[] {
    return [...fixture.nativeElement.querySelectorAll('[data-testid="space-nav"] a')].map((link: HTMLAnchorElement) =>
      link.textContent?.trim() ?? '',
    );
  }

  function text(selector: string): string {
    return fixture.nativeElement.querySelector(selector)?.textContent?.trim() ?? '';
  }

  function lineSpaces(): string[] {
    return [...fixture.nativeElement.querySelectorAll('[data-testid="parent-temps-line"]')].map(
      (line) => (line as HTMLElement).getAttribute('data-space') ?? '',
    );
  }

  function flushHeader(): void {
    http.expectOne('http://localhost:8080/api/int/auth/me').flush({ displayName: 'Parent' });
    http
      .expectOne('http://localhost:8080/api/int/auth/spaces')
      .flush({ roles: ['parent'], teacherRequest: 'none' });
  }
});

function sejoursUrl(childId: number): string {
  return `http://localhost:8080/api/int/parent/children/${childId}/sejours`;
}

function exceeded() {
  return {
    ...november(),
    plafond: {
      limitMinutes: 30,
      exceeded: true,
      message: 'Plafond du jour dépassé.',
      editable: true,
    },
  };
}

function november() {
  return {
    monthLabel: 'novembre 2026',
    year: 2026,
    month: 11,
    currentMonth: true,
    journees: [
      {
        year: 2026,
        month: 11,
        day: 22,
        today: true,
        dateLabel: '22 novembre 2026',
        durationLabel: '7 min',
        durationSeconds: 420,
        lines: [
          { space: 'accueil', label: 'Accueil', durationLabel: '6 min 45', durationSeconds: 405 },
          {
            space: 'question',
            label: 'Combien font 2 + 2 ?',
            subjectName: 'Maths',
            durationLabel: '15 s',
            durationSeconds: 15,
          },
          { space: 'profil', label: 'Profil', durationLabel: '30 s', durationSeconds: 30 },
        ],
      },
      {
        year: 2026,
        month: 11,
        day: 21,
        today: false,
        dateLabel: '21 novembre 2026',
        durationLabel: '2 min',
        durationSeconds: 120,
        lines: [{ space: 'board', label: 'Board', durationLabel: '2 min', durationSeconds: 120 }],
      },
    ],
  };
}

function parentToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = btoa(JSON.stringify({ exp, activeRole: 'parent', roles: ['parent'] })).replace(/=+$/, '');
  return `e30.${body}.sig`;
}

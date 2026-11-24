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
    expect(menuLabels()).toEqual(['Accueil', 'Enfants', 'Profil', 'Matières', 'Humeur', 'Temps']);

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
    expect(lines.map((line) => line.getAttribute('data-space'))).toEqual(['accueil', 'question']);
    expect(lines[0].querySelector('[data-testid="parent-temps-label"]')?.textContent).toBe('Accueil');
    expect(lines[0].textContent).toContain('6 min 45');
    expect(lines[1].querySelector('[data-testid="parent-temps-subject"]')?.textContent).toBe('Maths');
    const bar = fixture.nativeElement.querySelector('[data-testid="parent-temps-day-22"] .bar') as HTMLElement;
    expect([...bar.querySelectorAll('.seg')].map((seg) => seg.getAttribute('data-space'))).toEqual([
      'accueil',
      'question',
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

  function menuLabels(): string[] {
    return [...fixture.nativeElement.querySelectorAll('[data-testid="space-nav"] a')].map((link: HTMLAnchorElement) =>
      link.textContent?.trim() ?? '',
    );
  }

  function text(selector: string): string {
    return fixture.nativeElement.querySelector(selector)?.textContent?.trim() ?? '';
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

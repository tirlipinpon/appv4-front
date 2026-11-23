import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../core/auth/auth.service';
import { ParentTempsPage } from './parent-temps.page';

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

  it('place Temps juste après Humeur, ouvre le premier enfant et montre les libellés reçus', () => {
    expect(menuLabels()).toEqual(['Accueil', 'Enfants', 'Profil', 'Matières', 'Humeur', 'Temps']);
    expect(fixture.nativeElement.querySelector('[data-testid="parent-nav-temps"]').getAttribute('href')).toContain(
      '/parent/temps',
    );

    http.expectOne('http://localhost:8080/api/int/parent/children').flush({
      children: [
        { id: 2, firstName: 'Akira', lastName: 'Iris' },
        { id: 5, firstName: 'Nao', lastName: 'Iris' },
      ],
    });
    const sejour = http.expectOne('http://localhost:8080/api/int/parent/children/2/sejours');
    expect(sejour.request.method).toBe('GET');
    sejour.flush({
      sejours: [
        {
          dateLabel: '22 novembre 2026',
          timeLabel: '21:50',
          durationLabel: '1 min 30',
          lines: [
            { label: 'Accueil', durationLabel: '40 s' },
            { label: 'Combien font 2 + 2 ?', subjectName: 'Maths', durationLabel: '2 min' },
          ],
        },
        {
          dateLabel: '21 novembre 2026',
          timeLabel: '16:00',
          durationLabel: '2 min',
          lines: [{ label: 'Board', durationLabel: '2 min' }],
        },
      ],
    });
    flushHeader();
    fixture.detectChanges();

    const rows = sejourRows();
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('22 novembre 2026');
    expect(rows[0].textContent).toContain('21:50');
    expect(rows[0].textContent).toContain('1 min 30');
    expect(rows[1].textContent).toContain('21 novembre 2026');
    expect(rows[1].textContent).toContain('16:00');
    expect(rows[1].textContent).toContain('2 min');
    const lines = [...rows[0].querySelectorAll('[data-testid="parent-temps-line"]')] as HTMLElement[];
    expect(lines.map((line) => line.querySelector('[data-testid="parent-temps-label"]')?.textContent)).toEqual([
      'Accueil',
      'Combien font 2 + 2 ?',
    ]);
    expect(lines[0].querySelector('[data-testid="parent-temps-subject"]')).toBeNull();
    expect(lines[0].textContent).toContain('40 s');
    expect(lines[1].querySelector('[data-testid="parent-temps-subject"]')?.textContent).toBe('Maths');
    expect(lines[1].textContent).toContain('2 min');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-child"]')?.textContent).toContain('Akira');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-child"]')?.textContent).toContain('Iris');

    (fixture.nativeElement.querySelector('[data-testid="parent-temps-pick-5"]') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/api/int/parent/children/5/sejours').flush({ sejours: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-child"]')?.textContent).toContain('Nao');
    expect(sejourRows().length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('22 novembre 2026');
    expect(fixture.nativeElement.textContent).not.toContain('1 min 30');
  });

  it('montre le nom et aucun exemple quand l’enfant n’a pas de séjour', () => {
    http.expectOne('http://localhost:8080/api/int/parent/children').flush({
      children: [{ id: 5, firstName: 'Nao', lastName: 'Iris' }],
    });
    http.expectOne('http://localhost:8080/api/int/parent/children/5/sejours').flush({ sejours: [] });
    flushHeader();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-child"]')?.textContent).toContain('Nao');
    expect(sejourRows().length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('40 s');
    expect(fixture.nativeElement.textContent).not.toContain('22 novembre 2026');
  });

  it('reste vide sans enfant et sans exemple', () => {
    http.expectOne('http://localhost:8080/api/int/parent/children').flush({ children: [] });
    http.expectNone((req) => req.url.includes('/sejours'));
    flushHeader();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-child"]')).toBeNull();
    expect(sejourRows().length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('40 s');
    expect(fixture.nativeElement.textContent).not.toContain('Akira');
  });

  it('affiche le message renvoyé quand l’enfant est introuvable', () => {
    http.expectOne('http://localhost:8080/api/int/parent/children').flush({
      children: [{ id: 9, firstName: 'Lina', lastName: 'Or' }],
    });
    http.expectOne('http://localhost:8080/api/int/parent/children/9/sejours').flush(
      { message: 'Cet enfant est introuvable.' },
      { status: 404, statusText: 'Not Found' },
    );
    flushHeader();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="parent-temps-error"]')?.textContent?.trim()).toBe(
      'Cet enfant est introuvable.',
    );
    expect(sejourRows().length).toBe(0);
  });

  function menuLabels(): string[] {
    return [...fixture.nativeElement.querySelectorAll('[data-testid="space-nav"] a')].map((link: HTMLAnchorElement) =>
      link.textContent?.trim() ?? '',
    );
  }

  function sejourRows(): HTMLElement[] {
    return [...fixture.nativeElement.querySelectorAll('[data-testid="parent-temps-sejour"]')];
  }

  function flushHeader(): void {
    http.expectOne('http://localhost:8080/api/int/auth/me').flush({ displayName: 'Parent' });
    http
      .expectOne('http://localhost:8080/api/int/auth/spaces')
      .flush({ roles: ['parent'], teacherRequest: 'none' });
  }
});

function parentToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = btoa(JSON.stringify({ exp, activeRole: 'parent', roles: ['parent'] })).replace(/=+$/, '');
  return `e30.${body}.sig`;
}

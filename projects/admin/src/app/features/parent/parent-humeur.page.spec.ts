import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParentHumeurPage } from './parent-humeur.page';

describe('ParentHumeurPage', () => {
  let fixture: ComponentFixture<ParentHumeurPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentHumeurPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParentHumeurPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('montre le choix, la date et l’heure, et un enfant sans humeur', () => {
    flush([
      {
        id: 2,
        firstName: 'Akira',
        lastName: 'Iris',
        humeurs: [{ icon: '🙂', word: 'joie', dateLabel: '22 novembre 2026', timeLabel: '09:51' }],
      },
      { id: 5, firstName: 'Nao', lastName: 'Iris', humeurs: [] },
    ]);

    const first: HTMLElement = fixture.nativeElement.querySelector('[data-testid="parent-humeur-2"]');
    const second: HTMLElement = fixture.nativeElement.querySelector('[data-testid="parent-humeur-5"]');
    expect(first.textContent).toContain('Akira');
    expect(first.textContent).toContain('🙂');
    expect(first.textContent).toContain('joie');
    expect(first.textContent).toContain('22 novembre 2026');
    expect(first.textContent).toContain('09:51');
    expect(second.textContent).toContain('Nao');
    expect(second.querySelector('[data-testid="parent-humeur-icon"]')).toBeNull();
    expect(second.querySelector('[data-testid="parent-humeur-label"]')).toBeNull();
    const rows = [...fixture.nativeElement.querySelectorAll('.children > li')].map((item: HTMLElement) =>
      item.getAttribute('data-testid'),
    );
    expect(rows).toEqual(['parent-humeur-2', 'parent-humeur-5']);
  });

  it('montre une fermeture sans icône ni mot', () => {
    flush([
      {
        id: 2,
        firstName: 'Akira',
        lastName: 'Iris',
        humeurs: [{ label: 'Fermée sans réponse', dateLabel: '22 novembre 2026', timeLabel: '09:51' }],
      },
    ]);

    const row: HTMLElement = fixture.nativeElement.querySelector('[data-testid="parent-humeur-2"]');
    expect(row.textContent).toContain('Fermée sans réponse');
    expect(row.querySelector('[data-testid="parent-humeur-icon"]')).toBeNull();
    expect(row.querySelector('[data-testid="parent-humeur-word"]')).toBeNull();
  });

  it('garde l’ordre reçu, de la plus récente à la plus ancienne', () => {
    flush([
      {
        id: 2,
        firstName: 'Akira',
        lastName: 'Iris',
        humeurs: [
          { icon: '🙂', word: 'joie', dateLabel: '22 novembre 2026', timeLabel: '09:51' },
          { label: 'Fermée sans réponse', dateLabel: '22 novembre 2026', timeLabel: '08:51' },
        ],
      },
    ]);

    const lines = [
      ...fixture.nativeElement.querySelectorAll('[data-testid="parent-humeur-2"] .humeurs > li'),
    ].map((item: HTMLElement) => item.textContent ?? '');
    expect(lines[0]).toContain('joie');
    expect(lines[0]).toContain('09:51');
    expect(lines[1]).toContain('Fermée sans réponse');
    expect(lines[1]).toContain('08:51');
    expect(lines[1]).not.toContain('🙂');
  });

  function flush(children: unknown[]): void {
    http.expectOne((req) => req.method === 'GET' && req.url.includes('/parent/humeurs')).flush({ children });
    http.expectOne('http://localhost:8080/api/int/auth/me').flush({ displayName: 'Parent' });
    http.expectOne('http://localhost:8080/api/int/auth/spaces').flush({ roles: ['parent'], teacherRequest: 'none' });
    fixture.detectChanges();
  }
});

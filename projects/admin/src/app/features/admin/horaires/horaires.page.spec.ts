import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorairesPage } from './horaires.page';

describe('HorairesPage', () => {
  let fixture: ComponentFixture<HorairesPage>;
  let page: HorairesPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorairesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HorairesPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((req) => req.method === 'GET' && req.url.includes('/admin/app-hours'))
      .flush({
        opensAt: '06:00',
        closesAt: '22:00',
        closedMessage: "L'app est fermée jusqu'à 6 h.",
      });
    http.expectOne('http://localhost:8080/api/int/auth/me').flush({ displayName: 'Admin' });
    http.expectOne('http://localhost:8080/api/int/auth/spaces').flush({ roles: [], teacherRequest: 'none' });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('affiche les heures et la phrase renvoyées', () => {
    const opens = fixture.nativeElement.querySelector('[data-testid="hours-opens"]') as HTMLInputElement;
    const closes = fixture.nativeElement.querySelector('[data-testid="hours-closes"]') as HTMLInputElement;

    expect(opens.value).toBe('06:00');
    expect(closes.value).toBe('22:00');
    expect(fixture.nativeElement.textContent).toContain("L'app est fermée jusqu'à 6 h.");
  });

  it('enregistre les heures saisies et montre la phrase renvoyée', () => {
    const opens = fixture.nativeElement.querySelector('[data-testid="hours-opens"]') as HTMLInputElement;
    const closes = fixture.nativeElement.querySelector('[data-testid="hours-closes"]') as HTMLInputElement;
    opens.value = '08:30';
    opens.dispatchEvent(new Event('input'));
    closes.value = '18:00';
    closes.dispatchEvent(new Event('input'));

    fixture.nativeElement.querySelector('[data-testid="hours-save"]').click();

    const saved = http.expectOne((req) => req.method === 'PUT' && req.url.endsWith('/admin/app-hours'));
    expect(saved.request.body).toEqual({ opensAt: '08:30', closesAt: '18:00' });
    saved.flush({
      opensAt: '08:30',
      closesAt: '18:00',
      closedMessage: "L'app est fermée jusqu'à 8 h 30.",
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("L'app est fermée jusqu'à 8 h 30.");
    expect(opens.value).toBe('08:30');
  });

  it('affiche le refus de l’API sans remplacer les heures', () => {
    page.opensAt.set('25:00');
    page.closesAt.set('18:00');
    page.save();

    http
      .expectOne((req) => req.method === 'PUT' && req.url.endsWith('/admin/app-hours'))
      .flush({ message: "L'heure de début est illisible." }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("L'heure de début est illisible.");
    expect(fixture.nativeElement.textContent).toContain("L'app est fermée jusqu'à 6 h.");
    expect(page.opensAt()).toBe('25:00');
  });
});

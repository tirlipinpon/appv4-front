import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../core/auth/auth.service';
import { ParentSuivisPage } from './parent-suivis.page';

const childrenUrl = 'http://localhost:8080/api/int/parent/children';

describe('ParentSuivisPage', () => {
  let fixture: ComponentFixture<ParentSuivisPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ParentSuivisPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    TestBed.inject(AuthService).setToken(parentToken());
    fixture = TestBed.createComponent(ParentSuivisPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('ouvre la dernière semaine et montre la courbe, le jour et les blocs reçus', () => {
    openAkira(progress());

    expect(text('[data-testid="parent-suivis-child"]')).toContain('Akira');
    expect(text('[data-testid="parent-suivis-photo"]')).toContain('86 XP');
    expect(text('[data-testid="parent-suivis-photo"]')).toContain('Argent');
    expect(text('[data-testid="parent-suivis-photo"]')).toContain('série 4');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-next"]')?.disabled).toBeTrue();
    expect(text('[data-testid="parent-suivis-day-2026-11-16"]')).toContain('+8');
    expect(text('[data-testid="parent-suivis-day-2026-11-16"]')).toContain('2');
    expect(text('[data-testid="parent-suivis-day-2026-11-17"]')).toContain('—');
    expect(text('[data-testid="parent-suivis-success"]')).toContain('66,6');
    expect(text('[data-testid="parent-suivis-success"]')).toContain('3 jours');
    expect(text('[data-testid="parent-suivis-trend"]')).toContain('baisse');
    expect(text('[data-testid="parent-suivis-trend"]')).toContain('7 jours');
    expect(text('[data-testid="parent-suivis-slot"]')).toContain('Soir');
    expect(text('[data-testid="parent-suivis-minutes"]')).toContain('12');
    expect(text('[data-testid="parent-suivis-forme-qcm"]')).toContain('Choix multiples');
    const chart = fixture.nativeElement.querySelector('[data-testid="parent-suivis-chart"]') as SVGElement;
    expect(chart.textContent).toContain('0');
    expect(chart.textContent).toContain('100');
    expect(chart.textContent).toContain('Lun 9');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-day-2026-11-09"]')).toBeNull();
  });

  it('passe à la semaine précédente', () => {
    openAkira(progress());
    (fixture.nativeElement.querySelector('[data-testid="parent-suivis-previous"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-day-2026-11-09"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-day-2026-11-16"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-previous"]')?.disabled).toBeTrue();
  });

  it('ouvre un jour passé de la mission et change de semaine', () => {
    openAkira({
      ...progress(),
      dailyMissionDays: missionDays(),
    });

    expect(text('[data-testid="parent-suivis-mission-hero"]')).toContain('2/3');
    expect(text('[data-testid="parent-suivis-mission-hero"]')).toContain('En cours');
    expect(text('[data-testid="parent-suivis-mission-fail-2026-11-22T17:00:00Z"]')).toContain('Maths');
    expect(text('[data-testid="parent-suivis-mission-fail-2026-11-22T17:05:00Z"]')).toContain('3 + 4');

    (fixture.nativeElement.querySelector('[data-testid="parent-suivis-mission-day-2026-11-21"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(text('[data-testid="parent-suivis-mission-hero"]')).toContain('0/1');
    expect(text('[data-testid="parent-suivis-mission-hero"]')).toContain("Joue 1 question aujourd'hui");
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-mission-fail-2026-11-22T17:00:00Z"]')).toBeNull();

    (fixture.nativeElement.querySelector('[data-testid="parent-suivis-mission-previous"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(text('[data-testid="parent-suivis-mission-hero"]')).toContain('2/2');
    expect(text('[data-testid="parent-suivis-mission-hero"]')).toContain('Terminée');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-mission-previous"]')?.disabled).toBeTrue();
    expect(text('[data-testid="parent-suivis-photo"]')).toContain('86 XP');
  });

  it('cache les blocs absents', () => {
    openAkira({
      xpTotal: 0,
      currentStreak: 0,
      leagueLabel: 'Bronze',
      days: [],
      repeatedErrorPatterns: [],
    });

    expect(text('[data-testid="parent-suivis-photo"]')).toContain('0 XP');
    expect(text('[data-testid="parent-suivis-empty"]')).toBe('Pas encore de jour.');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-success"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-trend"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-slot"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-suivis-minutes"]')).toBeNull();
  });

  it('affiche le message de l’API quand l’enfant est refusé', () => {
    http.expectOne(childrenUrl).flush({
      children: [{ id: 2, firstName: 'Akira', lastName: 'Iris' }],
    });
    http.expectOne(progressUrl(2)).flush(
      { message: 'Cet enfant est introuvable.' },
      { status: 404, statusText: 'Not Found' },
    );
    flushHeader();
    fixture.detectChanges();

    expect(text('[data-testid="parent-suivis-error"]')).toBe('Cet enfant est introuvable.');
  });

  function openAkira(body: object): void {
    http.expectOne(childrenUrl).flush({
      children: [{ id: 2, firstName: 'Akira', lastName: 'Iris' }],
    });
    http.expectOne(progressUrl(2)).flush(body);
    flushHeader();
    fixture.detectChanges();
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

function progressUrl(childId: number): string {
  return `http://localhost:8080/api/int/parent/children/${childId}/progress`;
}

function missionDays() {
  const blank = (date: string) => ({ date, failedEssais: null });
  return [
    blank('2026-11-09'),
    blank('2026-11-10'),
    blank('2026-11-11'),
    {
      date: '2026-11-12',
      objective: "Joue 2 questions aujourd'hui",
      progress: 2,
      target: 2,
      status: 'terminee',
      statusLabel: 'Terminée',
      failedEssais: [],
    },
    blank('2026-11-13'),
    blank('2026-11-14'),
    blank('2026-11-15'),
    blank('2026-11-16'),
    blank('2026-11-17'),
    blank('2026-11-18'),
    blank('2026-11-19'),
    blank('2026-11-20'),
    {
      date: '2026-11-21',
      objective: "Joue 1 question aujourd'hui",
      progress: 0,
      target: 1,
      status: 'en_cours',
      statusLabel: 'En cours',
      failedEssais: [],
    },
    {
      date: '2026-11-22',
      objective: "Joue 3 questions aujourd'hui",
      progress: 2,
      target: 3,
      status: 'en_cours',
      statusLabel: 'En cours',
      failedEssais: [
        { subjectLabel: 'Maths', prompt: 'Exemple de texte : 3 + 4', at: '2026-11-22T17:00:00Z' },
        { subjectLabel: 'Maths', prompt: 'Exemple de texte : 3 + 4', at: '2026-11-22T17:05:00Z' },
      ],
    },
  ];
}

function progress() {
  return {
    xpTotal: 86,
    currentStreak: 4,
    leagueLabel: 'Argent',
    bestTimeSlotLabel: 'Soir',
    averageSessionMinutes: 12,
    trend: { direction: 'baisse', deltaSuccessPoints: -8, windowLabel: '7 jours' },
    recentSuccess: { successRate: 66.6, attemptCount: 3, windowLabel: '3 jours' },
    repeatedErrorPatterns: [{ formCode: 'qcm', count: 4, label: 'Choix multiples' }],
    days: [
      { date: '2026-11-09', xpGained: 4, xpTotal: 4, passed: 1, failed: 0 },
      { date: '2026-11-10', xpGained: 0, xpTotal: 4, passed: null, failed: null },
      { date: '2026-11-16', xpGained: 8, xpTotal: 80, passed: 2, failed: 1 },
      { date: '2026-11-17', xpGained: 6, xpTotal: 86, passed: null, failed: null },
    ],
  };
}

function parentToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = btoa(JSON.stringify({ exp, activeRole: 'parent', roles: ['parent'] })).replace(/=+$/, '');
  return `e30.${body}.sig`;
}

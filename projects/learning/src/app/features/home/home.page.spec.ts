import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ChildAuthService,
          useValue: {
            getToken: () => 'child-token',
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(HomePage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, http };
  }

  it('affiche XP, streak, palier et la semaine renvoyés par /api/ext/progress', () => {
    const { fixture, http } = setup();

    const request = http.expectOne('http://localhost:8080/api/ext/progress');
    expect(request.request.headers.get('Authorization')).toBe('Bearer child-token');
    request.flush({
      xpTotal: 60,
      currentStreak: 2,
      leagueLabel: 'Argent',
      weekDays: [false, false, true, false, false, false, false],
    });
    http.expectOne('http://localhost:8080/api/ext/today').flush({ mission: null });
    http.expectOne('http://localhost:8080/api/ext/badges').flush({ badges: [], gainedToday: [] });
    fixture.detectChanges();

    const stats = fixture.nativeElement.querySelector('[data-testid="home-progress-stats"]');
    expect(stats.textContent).toContain('60');
    expect(stats.textContent).toContain('2');
    expect(stats.textContent).toContain('Argent');

    const played = fixture.nativeElement.querySelector('[data-played="true"]');
    expect(played).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="home-mission-empty"]').textContent).toContain(
      'Aucune mission',
    );
    http.verify();
  });

  it('affiche la mission, le plan et le lien Play renvoyés par /api/ext/today', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/progress').flush({
      xpTotal: 0,
      currentStreak: 0,
      leagueLabel: 'Bronze',
      weekDays: [false, false, false, false, false, false, false],
    });
    const today = http.expectOne('http://localhost:8080/api/ext/today');
    expect(today.request.headers.get('Authorization')).toBe('Bearer child-token');
    today.flush({
      mission: {
        id: 8,
        objective: 'Joue 2 questions aujourd\'hui',
        progress: 1,
        target: 2,
        rewardXp: 20,
        status: 'en_cours',
        statusLabel: 'En cours',
        secondsRemaining: 5400,
        playSubjectId: 5,
        playQuestionId: 21,
        playable: true,
        tasks: [
          {
            id: 1,
            label: 'Maths',
            progress: 1,
            target: 1,
            rewardXp: 10,
            status: 'faite',
            statusLabel: 'Faite',
            subjectId: 4,
            questionId: 11,
            playable: false,
          },
          {
            id: 2,
            label: 'Mots',
            progress: 0,
            target: 1,
            rewardXp: 10,
            status: 'a_faire',
            statusLabel: 'À faire',
            subjectId: 5,
            questionId: 21,
            playable: true,
          },
        ],
      },
    });
    http.expectOne('http://localhost:8080/api/ext/badges').flush({ badges: [], gainedToday: [] });
    fixture.detectChanges();

    const mission = fixture.nativeElement.querySelector('[data-testid="home-mission"]');
    expect(mission.textContent).toContain('Joue 2 questions aujourd\'hui');
    expect(mission.textContent).toContain('En cours');
    expect(mission.textContent).toContain('1 h 30 min');
    expect(mission.textContent).toContain('1 / 2');
    expect(mission.textContent).toContain('Maths');
    expect(mission.textContent).toContain('Faite');
    expect(mission.textContent).toContain('À faire');

    const missionPlay: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-testid="home-mission-play"]');
    expect(missionPlay.getAttribute('href')).toBe('/learn/5/play/21');
    expect(fixture.nativeElement.querySelector('[data-testid="home-task-play-1"]')).toBeNull();
    const taskPlay: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-testid="home-task-play-2"]');
    expect(taskPlay.getAttribute('href')).toBe('/learn/5/play/21');

    const cont = fixture.nativeElement.querySelector('[data-testid="home-continue"]');
    expect(cont).toBeTruthy();
    expect(cont.textContent).toContain('Mots');
    expect(cont.textContent).toContain('1 / 2');
    const continuePlay: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '[data-testid="home-continue-play"]',
    );
    expect(continuePlay.getAttribute('href')).toBe('/learn/5/play/21');
    http.verify();
  });

  it('masque Play quand la mission est terminée', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/progress').flush({
      xpTotal: 10,
      currentStreak: 1,
      leagueLabel: 'Bronze',
      weekDays: [true, false, false, false, false, false, false],
    });
    http.expectOne('http://localhost:8080/api/ext/today').flush({
      mission: {
        id: 9,
        objective: 'Joue 1 question aujourd\'hui',
        progress: 1,
        target: 1,
        rewardXp: 10,
        status: 'terminee',
        statusLabel: 'Terminée',
        secondsRemaining: 100,
        playSubjectId: null,
        playQuestionId: null,
        playable: false,
        tasks: [
          {
            id: 3,
            label: 'Maths',
            progress: 1,
            target: 1,
            rewardXp: 10,
            status: 'faite',
            statusLabel: 'Faite',
            subjectId: 4,
            questionId: 11,
            playable: false,
          },
        ],
      },
    });
    http.expectOne('http://localhost:8080/api/ext/badges').flush({ badges: [], gainedToday: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="home-mission-status"]').textContent).toContain(
      'Terminée',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="home-mission-play"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-task-play-3"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-continue"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-badges-today"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-badge-notice"]')).toBeNull();
    http.verify();
  });

  it('affiche le niveau gagné aujourd hui et l avertissement renvoyés', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/progress').flush({
      xpTotal: 0,
      currentStreak: 0,
      leagueLabel: 'Bronze',
      weekDays: [false, false, false, false, false, false, false],
    });
    http.expectOne('http://localhost:8080/api/ext/today').flush({ mission: null });
    http.expectOne('http://localhost:8080/api/ext/badges').flush({
      badges: [],
      gainedToday: [{ code: 'etoiles_jaunes', name: 'Étoiles jaunes', level: 1 }],
      notice: {
        label: "Mathématiques : 2 questions ne sont pas encore jaunes.",
        subjectName: 'Mathématiques',
        remainingCount: 2,
      },
    });
    fixture.detectChanges();

    const today = fixture.nativeElement.querySelector('[data-testid="home-badges-today"]');
    expect(today.textContent).toContain('Étoiles jaunes');
    expect(today.textContent).toContain('1');
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-testid="home-badge-etoiles_jaunes"] a');
    expect(link.getAttribute('href')).toBe('/rewards');
    expect(fixture.nativeElement.querySelector('[data-testid="home-badge-notice"]').textContent).toContain(
      'Mathématiques : 2 questions ne sont pas encore jaunes.',
    );
    http.verify();
  });
});

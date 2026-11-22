import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { RewardsPage } from '../rewards/rewards.page';
import { HomePage } from './home.page';

describe('HomePage', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [HomePage, RewardsPage],
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
    http.expectOne('http://localhost:8080/api/ext/featured').flush([]);
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
    settleHumeur(http);
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
    http.expectOne('http://localhost:8080/api/ext/featured').flush([]);
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
    settleHumeur(http);
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
    http.expectOne('http://localhost:8080/api/ext/featured').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="home-mission-status"]').textContent).toContain(
      'Terminée',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="home-mission-play"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-task-play-3"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-continue"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-badges-today"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-badge-notice"]')).toBeNull();
    settleHumeur(http);
    http.verify();
  });

  it('affiche Leçons finies dans les gains du jour et rafraîchit le niveau en ouvrant la collection', () => {
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
      gainedToday: [{ code: 'lecons_finies', name: 'Leçons finies', level: 1 }],
    });
    http.expectOne('http://localhost:8080/api/ext/featured').flush([]);
    fixture.detectChanges();

    const today = fixture.nativeElement.querySelector('[data-testid="home-badges-today"]');
    expect(today.textContent).toContain('Leçons finies');
    expect(today.textContent).toContain('1');
    expect(fixture.nativeElement.querySelector('[data-testid="home-badge-notice"]')).toBeNull();

    fixture.destroy();
    const collection = TestBed.createComponent(RewardsPage);
    collection.detectChanges();
    http.expectOne('http://localhost:8080/api/ext/badges').flush({
      badges: [{ code: 'lecons_finies', name: 'Leçons finies', level: 2 }],
    });
    collection.detectChanges();
    expect(collection.nativeElement.querySelector('[data-testid="reward-lecons_finies"]').textContent)
      .toContain('Niveau 2');
    settleHumeur(http);
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
    http.expectOne('http://localhost:8080/api/ext/featured').flush([]);
    fixture.detectChanges();

    const today = fixture.nativeElement.querySelector('[data-testid="home-badges-today"]');
    expect(today.textContent).toContain('Étoiles jaunes');
    expect(today.textContent).toContain('1');
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-testid="home-badge-etoiles_jaunes"] a');
    expect(link.getAttribute('href')).toBe('/rewards');
    expect(fixture.nativeElement.querySelector('[data-testid="home-badge-notice"]').textContent).toContain(
      'Mathématiques : 2 questions ne sont pas encore jaunes.',
    );
    settleHumeur(http);
    http.verify();
  });

  it('affiche trois énoncés après Continuer et avant la mission', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/progress').flush({
      xpTotal: 0,
      currentStreak: 0,
      leagueLabel: 'Bronze',
      weekDays: [false, false, false, false, false, false, false],
    });
    http.expectOne('http://localhost:8080/api/ext/today').flush({
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
    http.expectOne('http://localhost:8080/api/ext/featured').flush([
      { subjectId: 4, subjectName: 'Mathématiques', questionId: 11, prompt: 'Combien font 3 + 4 ?' },
      { subjectId: 5, subjectName: 'Mots', questionId: 21, prompt: 'Quel animal dit miaou ?' },
      { subjectId: 8, subjectName: 'Histoire', questionId: 30, prompt: 'Quelle est la capitale de la France ?' },
    ]);
    fixture.detectChanges();

    const continueBlock: HTMLElement = fixture.nativeElement.querySelector('[data-testid="home-continue"]');
    const block: HTMLElement = fixture.nativeElement.querySelector('[data-testid="home-featured"]');
    const mission: HTMLElement = fixture.nativeElement.querySelector('[data-testid="home-mission"]');
    expect(continueBlock.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(block.compareDocumentPosition(mission) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(continueBlock.contains(block)).toBeFalse();
    expect(mission.contains(block)).toBeFalse();

    const links: NodeListOf<HTMLAnchorElement> = block.querySelectorAll('a');
    expect(links.length).toBe(3);
    expect(links[0].querySelector('.home-featured-subject')?.textContent?.trim()).toBe('Mathématiques');
    expect(links[0].querySelector('.home-featured-prompt')?.textContent?.trim()).toBe('Combien font 3 + 4 ?');
    expect(links[0].getAttribute('href')).toBe('/learn/4/play/11');
    expect(links[1].querySelector('.home-featured-subject')?.textContent?.trim()).toBe('Mots');
    expect(links[1].querySelector('.home-featured-prompt')?.textContent?.trim()).toBe('Quel animal dit miaou ?');
    expect(links[1].getAttribute('href')).toBe('/learn/5/play/21');
    expect(links[2].querySelector('.home-featured-subject')?.textContent?.trim()).toBe('Histoire');
    expect(links[2].querySelector('.home-featured-prompt')?.textContent?.trim()).toBe('Quelle est la capitale de la France ?');
    expect(links[2].getAttribute('href')).toBe('/learn/8/play/30');
    expect(block.querySelectorAll('button').length).toBe(0);
    expect(block.querySelector('h1, h2, h3, h4')).toBeNull();
    expect(
      (block.textContent ?? '')
        .replace('Combien font 3 + 4 ?', '')
        .replace('Quel animal dit miaou ?', '')
        .replace('Quelle est la capitale de la France ?', '')
        .replace('Mathématiques', '')
        .replace('Mots', '')
        .replace('Histoire', '')
        .trim(),
    ).toBe('');
    settleHumeur(http);
    http.verify();
  });

  it('affiche deux énoncés quand la lecture en renvoie deux', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/progress').flush({
      xpTotal: 0,
      currentStreak: 0,
      leagueLabel: 'Bronze',
      weekDays: [false, false, false, false, false, false, false],
    });
    http.expectOne('http://localhost:8080/api/ext/today').flush({ mission: null });
    http.expectOne('http://localhost:8080/api/ext/badges').flush({ badges: [], gainedToday: [] });
    http.expectOne('http://localhost:8080/api/ext/featured').flush([
      { subjectId: 2, subjectName: 'Français', questionId: 9, prompt: 'Épelle le mot chat' },
      { subjectId: 6, subjectName: 'Mathématiques', questionId: 4, prompt: '2 × 5 = ?' },
    ]);
    fixture.detectChanges();

    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll(
      '[data-testid="home-featured"] a',
    );
    expect(links.length).toBe(2);
    expect(links[0].querySelector('.home-featured-subject')?.textContent?.trim()).toBe('Français');
    expect(links[0].querySelector('.home-featured-prompt')?.textContent?.trim()).toBe('Épelle le mot chat');
    expect(links[0].getAttribute('href')).toBe('/learn/2/play/9');
    expect(links[1].querySelector('.home-featured-prompt')?.textContent?.trim()).toBe('2 × 5 = ?');
    expect(links[1].getAttribute('href')).toBe('/learn/6/play/4');
    settleHumeur(http);
    http.verify();
  });

  it('ne dessine pas de bloc quand la lecture réussit avec une liste vide', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/progress').flush({
      xpTotal: 0,
      currentStreak: 0,
      leagueLabel: 'Bronze',
      weekDays: [false, false, false, false, false, false, false],
    });
    http.expectOne('http://localhost:8080/api/ext/today').flush({
      mission: {
        id: 8,
        objective: 'Joue 1 question aujourd\'hui',
        progress: 0,
        target: 1,
        rewardXp: 10,
        status: 'en_cours',
        statusLabel: 'En cours',
        secondsRemaining: 60,
        playSubjectId: 4,
        playQuestionId: 11,
        playable: true,
        tasks: [],
      },
    });
    http.expectOne('http://localhost:8080/api/ext/badges').flush({ badges: [], gainedToday: [] });
    http.expectOne('http://localhost:8080/api/ext/featured').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="home-featured"]')).toBeNull();
    const mission: HTMLElement = fixture.nativeElement.querySelector('[data-testid="home-mission"]');
    expect(mission.textContent).toContain('Mission du jour');
    expect(mission.textContent).toContain('Joue 1 question aujourd\'hui');
    settleHumeur(http);
    http.verify();
  });

  it('affiche le message de l API quand la lecture des questions échoue', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/progress').flush({
      xpTotal: 0,
      currentStreak: 0,
      leagueLabel: 'Bronze',
      weekDays: [false, false, false, false, false, false, false],
    });
    http.expectOne('http://localhost:8080/api/ext/today').flush({ mission: null });
    http.expectOne('http://localhost:8080/api/ext/badges').flush({ badges: [], gainedToday: [] });
    http.expectOne('http://localhost:8080/api/ext/featured').flush(
      { message: 'Lecture des questions indisponible.' },
      { status: 503, statusText: 'Unavailable' },
    );
    fixture.detectChanges();

    const error: HTMLElement = fixture.nativeElement.querySelector('[data-testid="home-featured-error"]');
    expect(error.textContent?.trim()).toBe('Lecture des questions indisponible.');
    expect(error.classList.contains('home-progress-error')).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="home-featured"]')).toBeNull();
    settleHumeur(http);
    http.verify();
  });

  it('place les énoncés avant la mission quand Continuer est absent', () => {
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
    http.expectOne('http://localhost:8080/api/ext/featured').flush([
      { subjectId: 3, subjectName: 'Français', questionId: 15, prompt: 'Lis la phrase à voix haute.' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="home-continue"]')).toBeNull();
    const block: HTMLElement = fixture.nativeElement.querySelector('[data-testid="home-featured"]');
    const mission: HTMLElement = fixture.nativeElement.querySelector('[data-testid="home-mission"]');
    const link: HTMLAnchorElement = block.querySelector('a')!;
    expect(link.querySelector('.home-featured-subject')?.textContent?.trim()).toBe('Français');
    expect(link.querySelector('.home-featured-prompt')?.textContent?.trim()).toBe('Lis la phrase à voix haute.');
    expect(link.getAttribute('href')).toBe('/learn/3/play/15');
    expect(block.compareDocumentPosition(mission) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(mission.contains(block)).toBeFalse();
    settleHumeur(http);
    http.verify();
  });

  it('affiche Chargement… tant que la lecture des questions n a pas répondu', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/progress').flush({
      xpTotal: 0,
      currentStreak: 0,
      leagueLabel: 'Bronze',
      weekDays: [false, false, false, false, false, false, false],
    });
    http.expectOne('http://localhost:8080/api/ext/today').flush({
      mission: {
        id: 8,
        objective: 'Joue 1 question aujourd\'hui',
        progress: 0,
        target: 1,
        rewardXp: 10,
        status: 'en_cours',
        statusLabel: 'En cours',
        secondsRemaining: 60,
        playSubjectId: 4,
        playQuestionId: 11,
        playable: true,
        tasks: [],
      },
    });
    http.expectOne('http://localhost:8080/api/ext/badges').flush({ badges: [], gainedToday: [] });
    fixture.detectChanges();

    const pending: HTMLElement = fixture.nativeElement.querySelector('[data-testid="home-featured-loading"]');
    const mission: HTMLElement = fixture.nativeElement.querySelector('[data-testid="home-mission"]');
    expect(pending.textContent?.trim()).toBe('Chargement…');
    expect(pending.classList.contains('home-progress-status')).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="home-mission-loading"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-featured"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-featured-error"]')).toBeNull();
    expect(pending.compareDocumentPosition(mission) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    http.expectOne('http://localhost:8080/api/ext/featured').flush([
      { subjectId: 4, questionId: 11, prompt: 'Combien font 3 + 4 ?' },
    ]);
    settleHumeur(http);
    http.verify();
  });

  it('montre les choix renvoyés et envoie l’identifiant', () => {
    const { fixture, http } = setup();
    flushHome(http);
    http.expectOne('http://localhost:8080/api/ext/humeur').flush({
      ask: true,
      message: 'Comment tu te sens ?',
      choices: [
        { id: 3, word: 'calme' },
        { id: 4, icon: '🙂' },
      ],
    });
    fixture.detectChanges();

    const popup: HTMLElement = fixture.nativeElement.querySelector('[data-testid="humeur-popup"]');
    expect(popup.querySelector('[data-testid="humeur-message"]')?.textContent).toContain('Comment tu te sens ?');
    const buttons = [...popup.querySelectorAll('button')].map((button: HTMLElement) => button.textContent);
    expect(buttons[0]).toContain('calme');
    expect(popup.querySelector('[data-testid="humeur-choice-3"] [data-testid="humeur-choice-icon"]')).toBeNull();
    expect(buttons[1]).toContain('🙂');
    expect(popup.querySelector('[data-testid="humeur-choice-4"] [data-testid="humeur-choice-word"]')).toBeNull();

    popup.querySelector<HTMLButtonElement>('[data-testid="humeur-choice-3"]')?.click();
    const sent = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/humeur'));
    expect(sent.request.body).toEqual({ choiceId: 3 });
    sent.flush(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="humeur-popup"]')).toBeNull();
    http.verify();
  });

  it('ferme sans envoyer un identifiant', () => {
    const { fixture, http } = setup();
    flushHome(http);
    http.expectOne('http://localhost:8080/api/ext/humeur').flush({
      ask: true,
      choices: [{ id: 3, word: 'calme' }],
    });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="humeur-close"]').click();
    const sent = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/humeur'));
    expect(sent.request.body).toEqual({ closed: true });
    sent.flush(null);
    fixture.detectChanges();
    http.verify();
  });

  it('ne dessine pas la popup quand la liste est vide', () => {
    const { fixture, http } = setup();
    flushHome(http);
    http.expectOne('http://localhost:8080/api/ext/humeur').flush({ ask: true, choices: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="humeur-popup"]')).toBeNull();
    http.verify();
  });

  it('ne dessine pas la popup quand la lecture échoue', () => {
    const { fixture, http } = setup();
    flushHome(http);
    http
      .expectOne('http://localhost:8080/api/ext/humeur')
      .flush({ message: 'Session enfant invalide.' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="humeur-popup"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('joie');
    http.verify();
  });

  it('ne dessine pas la popup si on ne demande pas', () => {
    const { fixture, http } = setup();
    flushHome(http);
    http.expectOne('http://localhost:8080/api/ext/humeur').flush({ ask: false, choices: [{ id: 1, word: 'joie' }] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="humeur-popup"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('joie');
    http.verify();
  });
});

function flushHome(http: HttpTestingController): void {
  http.expectOne('http://localhost:8080/api/ext/progress').flush({
    xpTotal: 0,
    currentStreak: 0,
    leagueLabel: 'Bronze',
    weekDays: [false, false, false, false, false, false, false],
  });
  http.expectOne('http://localhost:8080/api/ext/today').flush({ mission: null });
  http.expectOne('http://localhost:8080/api/ext/badges').flush({ badges: [], gainedToday: [] });
  http.expectOne('http://localhost:8080/api/ext/featured').flush([]);
}

function settleHumeur(http: HttpTestingController): void {
  for (const request of http.match((req) => req.url.includes('/api/ext/humeur'))) {
    request.flush({ ask: false, choices: [] });
  }
}

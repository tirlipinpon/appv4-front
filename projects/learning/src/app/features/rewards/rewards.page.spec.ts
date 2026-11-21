import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { RewardsPage } from './rewards.page';

describe('RewardsPage', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [RewardsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ChildAuthService,
          useValue: { getToken: () => 'child-token' },
        },
      ],
    });
    const fixture = TestBed.createComponent(RewardsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, http };
  }

  it('affiche les neuf badges, la jauge sans date, puis la date renvoyée', () => {
    const { fixture, http } = setup();
    const request = http.expectOne('http://localhost:8080/api/ext/badges');
    expect(request.request.headers.get('Authorization')).toBe('Bearer child-token');
    request.flush({
      badges: [
        { code: 'premiere_etoile_jaune', name: 'Première étoile jaune', level: 1, retainedValue: 1, unlockedOn: '2026-11-21' },
        { code: 'matiere_au_jaune', name: 'Matière au jaune', level: 1, retainedValue: 1 },
        { code: 'etoiles_jaunes', name: 'Étoiles jaunes', level: 0, retainedValue: 4, progressValue: 4, nextThreshold: 5 },
        { code: 'rattrapage', name: 'Rattrapage', level: 1, retainedValue: 1, progressValue: 1, nextThreshold: 2, unlockedOn: '2026-11-19' },
        { code: 'bonnes_reponses_affilee', name: "Bonnes réponses d'affilée", level: 0, retainedValue: 0, progressValue: 0, nextThreshold: 3 },
        { code: 'bonnes_reponses_du_jour', name: 'Bonnes réponses du jour', level: 0, retainedValue: 0, progressValue: 0, nextThreshold: 3 },
        { code: 'jours_affilee', name: "Jours d'affilée", level: 0, retainedValue: 0, progressValue: 0, nextThreshold: 2 },
        { code: 'jours_joues', name: 'Jours joués', level: 0, retainedValue: 2, progressValue: 2, nextThreshold: 3 },
        { code: 'missions_terminees', name: 'Missions terminées', level: 1, retainedValue: 1, progressValue: 1, nextThreshold: 2, unlockedOn: '2026-11-18' },
      ],
      gainedToday: [],
    });
    fixture.detectChanges();

    const list: HTMLElement = fixture.nativeElement.querySelector('[data-testid="rewards-list"]');
    expect(list.textContent).toContain('Première étoile jaune');
    expect(list.textContent).toContain('Missions terminées');
    expect(fixture.nativeElement.querySelector('[data-testid="reward-gauge-etoiles_jaunes"]').textContent).toContain('4 / 5');
    expect(fixture.nativeElement.querySelector('[data-testid="reward-date-etoiles_jaunes"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="reward-date-rattrapage"]').textContent).toContain('2026-11-19');
    expect(fixture.nativeElement.querySelector('[data-testid="reward-gauge-matiere_au_jaune"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="rewards-notice"]')).toBeNull();
    http.verify();
  });

  it('affiche Leçons finies après Missions terminées quand l API l envoie', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/badges').flush({
      badges: [
        { code: 'missions_terminees', name: 'Missions terminées', level: 1, retainedValue: 1, progressValue: 1, nextThreshold: 2 },
        {
          code: 'lecons_finies',
          name: 'Leçons finies',
          level: 1,
          retainedValue: 1,
          progressValue: 1,
          nextThreshold: 2,
          unlockedOn: '2026-11-21',
        },
      ],
      gainedToday: [],
    });
    fixture.detectChanges();

    const cards = [...fixture.nativeElement.querySelectorAll('[data-testid^="reward-"]')]
      .map((node: Element) => node.getAttribute('data-testid'));
    expect(cards.indexOf('reward-missions_terminees')).toBeLessThan(cards.indexOf('reward-lecons_finies'));
    expect(fixture.nativeElement.querySelector('[data-testid="reward-gauge-lecons_finies"]').textContent).toContain('1 / 2');
    expect(fixture.nativeElement.querySelector('[data-testid="reward-date-lecons_finies"]').textContent).toContain('2026-11-21');
    http.verify();
  });

  it('affiche la serie en cours et conserve la date du niveau', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/badges').flush({
      badges: [
        {
          code: 'bonnes_reponses_affilee',
          name: "Bonnes réponses d'affilée",
          level: 1,
          retainedValue: 3,
          progressValue: 0,
          nextThreshold: 4,
          unlockedOn: '2026-11-18',
        },
      ],
      gainedToday: [],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="reward-gauge-bonnes_reponses_affilee"]').textContent)
      .toContain('0 / 4');
    expect(fixture.nativeElement.querySelector('[data-testid="reward-date-bonnes_reponses_affilee"]').textContent)
      .toContain('2026-11-18');
    expect(fixture.nativeElement.textContent).toContain('Niveau 1');
    http.verify();
  });

  it('affiche le libellé d avertissement renvoyé par l API', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/badges').flush({
      badges: [{ code: 'matiere_au_jaune', name: 'Matière au jaune', level: 1, retainedValue: 1, unlockedOn: '2026-11-18' }],
      gainedToday: [],
      notice: {
        label: "Mathématiques : 1 question n'est pas encore jaune.",
        subjectName: 'Mathématiques',
        remainingCount: 1,
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="rewards-notice"]').textContent).toContain(
      "Mathématiques : 1 question n'est pas encore jaune.",
    );
    http.verify();
  });

  it('affiche l erreur API', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/badges').flush(
      { message: 'Session enfant invalide.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="rewards-error"]').textContent).toContain(
      'Session enfant invalide.',
    );
    http.verify();
  });
});

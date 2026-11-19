import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { PlayQuestionPage } from './play-question.page';

describe('PlayQuestionPage', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [PlayQuestionPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ChildAuthService, useValue: { getToken: () => 'child-token' } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ subjectId: '5', questionId: '42' }),
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PlayQuestionPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, http };
  }

  it('affiche order via le composant partagé et envoie orderedItemIds', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'order',
      prompt: '',
      items: [
        { itemId: 1, label: 'Lundi' },
        { itemId: 2, label: 'Mardi' },
        { itemId: 3, label: 'Mercredi' },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="child-play-view-order"]')).toBeTruthy();
    expect(root.querySelectorAll('[data-testid^="child-play-view-order-item-"]').length).toBe(3);
    expect(root.querySelector('[data-testid^="child-play-view-order-axis-"]')).toBeNull();

    (root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement).click();
    const attempt = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(attempt.request.body.orderedItemIds.length).toBe(3);
    expect(new Set(attempt.request.body.orderedItemIds)).toEqual(new Set([1, 2, 3]));
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });

  it('order avec ligne du temps affiche le jalon renvoyé par l’API sur chaque étape', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'order',
      prompt: '',
      timelineEnabled: true,
      items: [
        { itemId: 1, label: 'Se lever', axisLabel: '7 h' },
        { itemId: 2, label: 'Partir à l’école', axisLabel: '8 h' },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const list = root.querySelector('[data-testid="child-play-view-order"]');
    expect(list?.classList.contains('timeline')).toBeTrue();
    expect(root.querySelector('[data-testid="child-play-view-order-axis-1"]')?.textContent).toContain('7 h');
    expect(root.querySelector('[data-testid="child-play-view-order-axis-2"]')?.textContent).toContain('8 h');
    http.verify();
  });

  it('affiche memory via le composant partagé et envoie les paires trouvées', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'memory',
      prompt: '',
      pairs: [
        { pairId: 1, questionSide: 'Chat', answerSide: 'Miaou' },
        { pairId: 2, questionSide: 'Pomme', answerSide: 'Fruit' },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="child-play-view-memory"]')).toBeTruthy();

    const cards = Array.from(
      root.querySelectorAll('[data-testid^="child-play-view-memory-card-"]'),
    ) as HTMLButtonElement[];
    expect(cards.length).toBe(4);

    const byKey = (key: string) =>
      root.querySelector(`[data-testid="child-play-view-memory-card-${key}"]`) as HTMLButtonElement;
    byKey('1-q').click();
    byKey('1-a').click();
    byKey('2-q').click();
    byKey('2-a').click();
    fixture.detectChanges();

    (root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement).click();
    const attempt = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(attempt.request.body.matchedPairIds).toEqual(jasmine.arrayContaining([1, 2]));
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });

  it('affiche vrai_faux via le composant partagé et envoie la réponse API', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'vrai_faux',
      prompt: 'Coche',
      statements: [
        { statementId: 1, label: '2 + 2 = 4' },
        { statementId: 2, label: '2 + 2 = 5' },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="child-question-play-view"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="child-play-view-true-false"]')).toBeTruthy();

    (root.querySelector('[data-testid="child-play-view-tf-1-true"]') as HTMLButtonElement).click();
    (root.querySelector('[data-testid="child-play-view-tf-2-false"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    (root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement).click();
    const attempt = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(attempt.request.body.statements).toEqual(
      jasmine.arrayContaining([
        { statementId: 1, value: true },
        { statementId: 2, value: false },
      ]),
    );
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });

  it('affiche liens et envoie les associations choisies', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'liens',
      prompt: 'Relie.',
      links: [
        { linkId: 1, leftLabel: 'Pomme', rightLabel: 'Fruit' },
        { linkId: 2, leftLabel: 'Chien', rightLabel: 'Animal' },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="child-play-view-links"]')).toBeTruthy();
    const click = (id: string) =>
      (root.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement).click();
    click('child-play-view-link-left-l-1');
    click('child-play-view-link-right-r-1');
    click('child-play-view-link-left-l-2');
    click('child-play-view-link-right-r-2');
    fixture.detectChanges();

    (root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement).click();
    const attempt = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(attempt.request.body.linkMatches).toEqual(
      jasmine.arrayContaining([
        { leftId: 1, rightId: 1 },
        { leftId: 2, rightId: 2 },
      ]),
    );
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });
});

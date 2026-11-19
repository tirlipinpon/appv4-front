import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
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

  it('réponse libre : un champ, Valider envoie attempt, un blanc ne part pas', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'texte',
      prompt: 'Capitale de la France',
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="child-play-view-prompt"]')?.textContent).toContain(
      'Capitale de la France',
    );
    expect(root.textContent).not.toContain('Paris');
    const input = root.querySelector('[data-testid="child-play-view-free-text"]') as HTMLInputElement;
    const submit = root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBeTrue();

    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(submit.disabled).toBeTrue();

    input.value = '  Pâris  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(submit.disabled).toBeFalse();
    submit.click();

    const attempt = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(attempt.request.body).toEqual({ attempt: '  Pâris  ' });
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });

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

  it('affiche case vide et envoie les mots placés', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'case_vide',
      prompt: 'Complète.',
      sentence: 'Le ___ mange une ___.',
      words: [
        { wordId: 10, label: 'chat' },
        { wordId: 11, label: 'pomme' },
        { wordId: 12, label: 'voiture' },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="child-play-view-gaps"]')).toBeTruthy();
    const click = (id: string) =>
      (root.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement).click();
    click('child-play-view-gap-hole-0');
    click('child-play-view-gap-word-w-10');
    click('child-play-view-gap-hole-1');
    click('child-play-view-gap-word-w-11');
    fixture.detectChanges();

    (root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement).click();
    const attempt = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(attempt.request.body.gapFills).toEqual(
      jasmine.arrayContaining([
        { holeIndex: 0, wordId: 10 },
        { holeIndex: 1, wordId: 11 },
      ]),
    );
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });

  it('simon : montre la suite, puis envoie la reprise au dernier pas, sans bouton Valider', fakeAsync(() => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'simon',
      prompt: 'Refais la suite',
      elementType: 'couleurs',
      elements: [
        { label: 'rouge', color: '#ff0000' },
        { label: 'bleu', color: '#0000ff' },
      ],
      sequence: [1, 0, 1],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const phase = () => root.querySelector('[data-testid="child-play-view-simon-phase"]')?.textContent ?? '';
    const progress = () => root.querySelector('[data-testid="child-play-view-simon-progress"]')?.textContent ?? '';
    const element = (index: number) =>
      root.querySelector(`[data-testid="child-play-view-simon-element-${index}"]`) as HTMLButtonElement;

    expect(phase()).toContain('Regardez');
    expect(root.querySelector('[data-testid="play-submit"]')).toBeNull();
    expect(element(0).textContent).toContain('rouge');
    expect(element(0).style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(element(0).disabled).toBeTrue();

    tick(700);
    fixture.detectChanges();
    expect(element(1).getAttribute('data-lit')).toBe('true');

    tick(3000);
    fixture.detectChanges();
    expect(phase()).toContain('Reproduisez');
    expect(progress()).toContain('Manche 1');

    element(1).click();
    fixture.detectChanges();
    http.expectNone('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');

    tick(3000);
    fixture.detectChanges();
    element(1).click();
    element(0).click();
    fixture.detectChanges();
    http.expectNone('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');

    tick(4000);
    fixture.detectChanges();
    element(1).click();
    element(0).click();
    element(1).click();
    const attempt = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(attempt.request.body).toEqual({ simonSequence: [1, 0, 1] });
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');

    (root.querySelector('[data-testid="play-replay"]') as HTMLButtonElement).click();
    const again = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42');
    expect(again.request.method).toBe('GET');
    again.flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'simon',
      prompt: 'Refais la suite',
      elementType: 'couleurs',
      elements: [
        { label: 'rouge', color: '#ff0000' },
        { label: 'bleu', color: '#0000ff' },
      ],
      sequence: [0, 1, 0],
    });
    fixture.detectChanges();
    tick(1);
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')).toBeNull();
    expect(root.querySelector('[data-testid="child-play-view-simon-phase"]')?.textContent).toContain('Regardez');
    flush();
    http.verify();
  }));
});

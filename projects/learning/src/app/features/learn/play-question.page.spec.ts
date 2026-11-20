import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { of } from 'rxjs';
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
            paramMap: of(convertToParamMap({ subjectId: '5', questionId: '42' })),
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
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'texte',
      formLabel: 'Réponse libre',
      iconCode: 'text',
      color: '#1aa6a6',
      prompt: 'Capitale de la France',
      content: {},
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="child-play-view-form"]')?.textContent).toContain('Réponse libre');
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
    expect(attempt.request.body).toEqual(jasmine.objectContaining({ formCode: 'texte', attempt: '  Pâris  ' }));
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });

  it('annule les vérifications de lettres remplacées par une frappe, une validation ou un rejeu', () => {
    const { fixture, http } = setup();
    const url = 'http://localhost:8080/api/ext/subjects/5/questions/42';
    http.expectOne(url + '/play').flush({ formCode: 'reponse_libre', content: { letterMask: '##', letterCount: 2 } });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const typeLetter = (index: number, value: string) => {
      const field = root.querySelector(`[data-testid="child-play-view-letter-${index}"]`) as HTMLInputElement;
      field.value = value;
      field.dispatchEvent(new Event('input'));
      return http.expectOne(`${url}/letter-locks`);
    };
    const first = typeLetter(0, 'a');
    const second = typeLetter(1, 'b');
    expect(first.cancelled).toBeTrue();
    fixture.detectChanges();
    (root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement).click();
    expect(second.cancelled).toBeTrue();
    const attempt = http.expectOne(`${url}/attempts`);
    expect(attempt.request.body).toEqual(jasmine.objectContaining({ formCode: 'reponse_libre', attempt: 'ab' }));
    attempt.flush({ passed: false });
    const finalCheck = http.expectOne(`${url}/letter-locks`);
    fixture.detectChanges();
    (root.querySelector('[data-testid="play-replay"]') as HTMLButtonElement).click();
    expect(finalCheck.cancelled).toBeTrue();
    http.verify();
  });

  it('désactive la soumission pour une forme inconnue', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play').flush({ formCode: 'future' });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="play-error"]')?.textContent).toContain('pas encore jouable');
    expect((root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement).disabled).toBeTrue();
    http.verify();
  });

  it('affiche order via le composant partagé et envoie orderedItemIds', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'order',
      prompt: '',
      content: {
        items: [
          { itemId: 1, label: 'Lundi' },
          { itemId: 2, label: 'Mardi' },
          { itemId: 3, label: 'Mercredi' },
        ],
      },
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
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'order',
      prompt: '',
      content: {
        timelineEnabled: true,
        items: [
          { itemId: 1, label: 'Se lever', axisLabel: '7 h' },
          { itemId: 2, label: 'Partir à l’école', axisLabel: '8 h' },
        ],
      },
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
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'memory',
      prompt: '',
      content: {
        memoryCards: [
          { cardId: '1-q', label: 'Chat' }, { cardId: '1-a', label: 'Miaou' },
          { cardId: '2-q', label: 'Pomme' }, { cardId: '2-a', label: 'Fruit' },
        ],
      },
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
    http.expectOne((req) => req.url.endsWith('/memory-pair')).flush({ matched: true });
    fixture.detectChanges();
    byKey('2-q').click();
    byKey('2-a').click();
    http.expectOne((req) => req.url.endsWith('/memory-pair')).flush({ matched: true });
    fixture.detectChanges();

    (root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement).click();
    const attempt = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(attempt.request.body.memoryMatches).toEqual([
      { firstCardId: '1-q', secondCardId: '1-a' },
      { firstCardId: '2-q', secondCardId: '2-a' },
    ]);
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });

  it('affiche vrai_faux via le composant partagé et envoie la réponse API', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'vrai_faux',
      prompt: 'Coche',
      content: {
        statements: [
          { statementId: 1, label: '2 + 2 = 4' },
          { statementId: 2, label: '2 + 2 = 5' },
        ],
      },
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
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'liens',
      prompt: 'Relie.',
      content: {
        linkLefts: [{ optionId: '1', label: 'Pomme' }, { optionId: '2', label: 'Chien' }],
        linkRights: [{ optionId: 'a', label: 'Fruit' }, { optionId: 'b', label: 'Animal' }],
      },
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="child-play-view-links"]')).toBeTruthy();
    const click = (id: string) =>
      (root.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement).click();
    click('child-play-view-link-left-l-1');
    click('child-play-view-link-right-r-a');
    click('child-play-view-link-left-l-2');
    click('child-play-view-link-right-r-b');
    fixture.detectChanges();

    (root.querySelector('[data-testid="play-submit"]') as HTMLButtonElement).click();
    const attempt = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(attempt.request.body.linkSelections).toEqual(
      jasmine.arrayContaining([
        { leftId: '1', rightId: 'a' },
        { leftId: '2', rightId: 'b' },
      ]),
    );
    attempt.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });

  it('affiche case vide et envoie les mots placés', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'case_vide',
      prompt: 'Complète.',
      content: {
        sentence: 'Le ___ mange une ___.',
        words: [
          { wordId: 10, label: 'chat' },
          { wordId: 11, label: 'pomme' },
          { wordId: 12, label: 'voiture' },
        ],
      },
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
    http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play').flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'simon',
      prompt: 'Refais la suite',
      challengeId: 'shown-simon-challenge',
      content: {
        elementType: 'couleurs',
        elements: [
          { label: 'rouge', color: '#ff0000' },
          { label: 'bleu', color: '#0000ff' },
        ],
        sequence: [1, 0, 1],
      },
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
    expect(attempt.request.body).toEqual(jasmine.objectContaining({
      formCode: 'simon', challengeId: 'shown-simon-challenge', simonSequence: [1, 0, 1], submissionId: jasmine.any(String),
    }));
    attempt.flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    (root.querySelector('[data-testid="play-retry"]') as HTMLButtonElement).click();
    const retry = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/attempts');
    expect(retry.request.body).toEqual(attempt.request.body);
    retry.flush({ passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');

    (root.querySelector('[data-testid="play-replay"]') as HTMLButtonElement).click();
    const again = http.expectOne('http://localhost:8080/api/ext/subjects/5/questions/42/play');
    expect(again.request.method).toBe('POST');
    again.flush({
      questionId: 42,
      subjectId: 5,
      formCode: 'simon',
      prompt: 'Refais la suite',
      challengeId: 'shown-simon-challenge',
      content: {
        elementType: 'couleurs',
        elements: [
          { label: 'rouge', color: '#ff0000' },
          { label: 'bleu', color: '#0000ff' },
        ],
        sequence: [0, 1, 0],
      },
    });
    fixture.detectChanges();
    tick(1);
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')).toBeNull();
    expect(root.querySelector('[data-testid="child-play-view-simon-phase"]')?.textContent).toContain('Regardez');
    flush();
    http.verify();
  }));

  it('permet de renvoyer les clics ordonnés après une erreur transitoire', () => {
    const { fixture, http } = setup();
    const url = 'http://localhost:8080/api/ext/subjects/5/questions/42';
    http.expectOne(url + '/play').flush({
      formCode: 'image_interactive',
      content: {
        imageWebp: 'AA==',
        clicksOrdered: true,
        clickZones: [{ zoneId: 1, shape: 'rect', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
        clickSteps: [{ zoneId: 1, prompt: 'Clique au centre' }],
      },
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const image = root.querySelector<HTMLElement>('[data-testid="child-play-view-click-image"]')!;
    spyOn(image, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 100, 100));
    image.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 50 }));
    const first = http.expectOne(url + '/attempts');
    expect(first.request.body).toEqual(jasmine.objectContaining({
      formCode: 'image_interactive', zoneClicks: [{ zoneId: 1 }], submissionId: jasmine.any(String),
    }));
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('[data-testid="play-retry"]')!.click();
    const retry = http.expectOne(url + '/attempts');
    expect(retry.request.body).toEqual(first.request.body);
    retry.flush({ attemptId: 8, passed: true, scorePercent: 100 });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="play-result"]')?.textContent).toContain('Bravo');
    http.verify();
  });
});

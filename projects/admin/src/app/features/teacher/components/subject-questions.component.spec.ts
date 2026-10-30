import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectQuestionsComponent } from './subject-questions.component';

const formsUrl = 'http://localhost:8080/api/int/teacher/question-forms';
const questionsUrl = 'http://localhost:8080/api/int/teacher/subjects/4/questions';

describe('SubjectQuestionsComponent', () => {
  let fixture: ComponentFixture<SubjectQuestionsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectQuestionsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(SubjectQuestionsComponent);
    fixture.componentInstance.subjectId = 4;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function boot(): void {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'qcm', label: 'Choix multiples', sortOrder: 1 }],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();
  }

  it('shows the form returned by the API and posts a multiple choice question', () => {
    boot();

    expect(fixture.nativeElement.textContent).toContain('Choix multiples');
    expect(fixture.nativeElement.textContent).toContain('Énoncé');

    const page = fixture.componentInstance;
    page.setPrompt('Combien font 2 + 2 ?');
    page.setChoiceLabel(0, '3');
    page.setChoiceLabel(1, '4');
    page.setChoiceCorrect(1, true);
    fixture.detectChanges();

    const save = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.includes('Enregistrer'),
    );
    save?.click();

    const req = http.expectOne(questionsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      formCode: 'qcm',
      prompt: 'Combien font 2 + 2 ?',
      choices: [
        { label: '3', correct: false },
        { label: '4', correct: true },
      ],
    });
    req.flush({
      id: 7,
      formCode: 'qcm',
      formLabel: 'Choix multiples',
      prompt: 'Combien font 2 + 2 ?',
      choices: [
        { id: 1, label: '3', correct: false },
        { id: 2, label: '4', correct: true },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Combien font 2 + 2 ?');
    expect(fixture.nativeElement.textContent).toContain('3');
    expect(fixture.nativeElement.textContent).toContain('Bonne réponse');
  });

  it('shows the API refusal', () => {
    boot();

    const save = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.includes('Enregistrer'),
    );
    save?.click();

    http.expectOne(questionsUrl).flush(
      { message: "L'énoncé est obligatoire." },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("L'énoncé est obligatoire.");
  });

  it('reopens an existing question and puts the correction', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'qcm', label: 'Choix multiples', sortOrder: 1 }],
    });
    http.expectOne(questionsUrl).flush({
      questions: [
        {
          id: 7,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: '2*2 ?',
          choices: [
            { id: 1, label: '3', correct: false },
            { id: 2, label: '4', correct: true },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const edit = buttonNamed('Modifier');
    edit?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tu modifies cette question.');
    expect(fixture.componentInstance.prompt()).toBe('2*2 ?');

    fixture.componentInstance.setPrompt('2*3 ?');
    fixture.componentInstance.setChoiceLabel(1, '6');
    fixture.detectChanges();

    buttonNamed('Enregistrer')?.click();

    const req = http.expectOne(`${questionsUrl}/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.prompt).toBe('2*3 ?');
    expect(req.request.body.choices[1]).toEqual({ label: '6', correct: true });
    req.flush({
      id: 7,
      formCode: 'qcm',
      formLabel: 'Choix multiples',
      prompt: '2*3 ?',
      choices: [
        { id: 3, label: '3', correct: false },
        { id: 4, label: '6', correct: true },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2*3 ?');
    expect(fixture.nativeElement.textContent).not.toContain('Tu modifies cette question.');
  });

  it('posts a memory question with its pairs', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [
        { code: 'qcm', label: 'Choix multiples', sortOrder: 1 },
        { code: 'memory', label: 'Memory', sortOrder: 2 },
      ],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();

    buttonNamed('Memory')?.click();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.setPairSide(0, 'questionSide', '2 + 2');
    page.setPairSide(0, 'answerSide', '4');
    page.setPairSide(1, 'questionSide', '3 + 3');
    page.setPairSide(1, 'answerSide', '6');
    fixture.detectChanges();

    buttonNamed('Enregistrer')?.click();

    const req = http.expectOne(questionsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      formCode: 'memory',
      prompt: '',
      pairs: [
        { questionSide: '2 + 2', answerSide: '4' },
        { questionSide: '3 + 3', answerSide: '6' },
      ],
    });
    req.flush({
      id: 8,
      formCode: 'memory',
      formLabel: 'Memory',
      prompt: '',
      choices: [],
      pairs: [
        { id: 1, questionSide: '2 + 2', answerSide: '4' },
        { id: 2, questionSide: '3 + 3', answerSide: '6' },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 + 2 — 4');
    expect(fixture.nativeElement.textContent).toContain('3 + 3 — 6');
  });

  it('posts an ordered list and shows the items in that order', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [
        { code: 'qcm', label: 'Choix multiples', sortOrder: 1 },
        { code: 'memory', label: 'Memory', sortOrder: 2 },
        { code: 'order', label: 'Ordre', sortOrder: 3 },
      ],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();

    buttonNamed('Ordre')?.click();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.setItemLabel(0, 'Lundi');
    page.setItemLabel(1, 'Mardi');
    fixture.detectChanges();

    buttonNamed('Enregistrer')?.click();

    const req = http.expectOne(questionsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      formCode: 'order',
      prompt: '',
      items: [{ label: 'Lundi' }, { label: 'Mardi' }],
    });
    req.flush({
      id: 9,
      formCode: 'order',
      formLabel: 'Ordre',
      prompt: '',
      choices: [],
      pairs: [],
      items: [
        { id: 1, label: 'Lundi' },
        { id: 2, label: 'Mardi' },
      ],
    });
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('ol.ordered li') as NodeListOf<HTMLElement>).map(
      (item) => item.textContent?.trim(),
    );
    expect(labels).toEqual(['Lundi', 'Mardi']);
  });

  it('posts true or false phrases and shows each side', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'vrai_faux', label: 'Vrai ou faux', sortOrder: 4 }],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();

    buttonNamed('Vrai ou faux')?.click();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.setPrompt('Dis si chaque phrase est vraie.');
    page.setStatementLabel(0, '2 + 2 = 4');
    page.setStatementSide(0, true);
    page.setStatementLabel(1, '3 + 3 = 5');
    page.setStatementSide(1, false);
    fixture.detectChanges();

    const vraiButtons = Array.from(
      fixture.nativeElement.querySelectorAll('button.side.vrai') as NodeListOf<HTMLButtonElement>,
    );
    const fauxButtons = Array.from(
      fixture.nativeElement.querySelectorAll('button.side.faux') as NodeListOf<HTMLButtonElement>,
    );
    expect(vraiButtons[0]?.classList.contains('selected')).toBeTrue();
    expect(vraiButtons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(fauxButtons[0]?.classList.contains('selected')).toBeFalse();
    expect(fauxButtons[1]?.classList.contains('selected')).toBeTrue();
    expect(vraiButtons[1]?.classList.contains('selected')).toBeFalse();

    const save = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).filter(
      (button) => button.textContent?.includes('Enregistrer'),
    );
    save[save.length - 1]?.click();

    const req = http.expectOne(questionsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      formCode: 'vrai_faux',
      prompt: 'Dis si chaque phrase est vraie.',
      statements: [
        { label: '2 + 2 = 4', truthful: true },
        { label: '3 + 3 = 5', truthful: false },
      ],
    });
    req.flush({
      id: 10,
      formCode: 'vrai_faux',
      formLabel: 'Vrai ou faux',
      prompt: 'Dis si chaque phrase est vraie.',
      choices: [],
      pairs: [],
      items: [],
      statements: [
        { id: 1, label: '2 + 2 = 4', truthful: true },
        { id: 2, label: '3 + 3 = 5', truthful: false },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dis si chaque phrase est vraie.');
    expect(fixture.nativeElement.textContent).toContain('2 + 2 = 4');
    expect(fixture.nativeElement.textContent).toContain('Vrai');
    expect(fixture.nativeElement.textContent).toContain('3 + 3 = 5');
    expect(fixture.nativeElement.textContent).toContain('Faux');
  });

  it('posts linked words and shows each answer', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'liens', label: 'Liens', sortOrder: 5 }],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();

    buttonNamed('Liens')?.click();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.setPrompt('Relie chaque mot.');
    page.setLinkSide(0, 'leftLabel', 'Pomme');
    page.setLinkSide(0, 'rightLabel', 'Fruit');
    page.setLinkSide(1, 'leftLabel', 'Chien');
    page.setLinkSide(1, 'rightLabel', 'Animal');
    fixture.detectChanges();

    const save = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).filter(
      (button) => button.textContent?.includes('Enregistrer'),
    );
    save[save.length - 1]?.click();

    const req = http.expectOne(questionsUrl);
    expect(req.request.body).toEqual({
      formCode: 'liens',
      prompt: 'Relie chaque mot.',
      links: [
        { leftLabel: 'Pomme', rightLabel: 'Fruit' },
        { leftLabel: 'Chien', rightLabel: 'Animal' },
      ],
    });
    req.flush({
      id: 11,
      formCode: 'liens',
      formLabel: 'Liens',
      prompt: 'Relie chaque mot.',
      choices: [],
      pairs: [],
      items: [],
      statements: [],
      links: [
        { id: 1, leftLabel: 'Pomme', rightLabel: 'Fruit' },
        { id: 2, leftLabel: 'Chien', rightLabel: 'Animal' },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Relie chaque mot.');
    expect(fixture.nativeElement.textContent).toContain('Pomme — Fruit');
    expect(fixture.nativeElement.textContent).toContain('Chien — Animal');
  });

  it('posts a sentence with its answer and its decoys', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'case_vide', label: 'Case vide', sortOrder: 6 }],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.setPrompt('Complète.');
    page.setSentence('Le chat mange une ___ dans le jardin.');
    page.setAnswer(0, 'pomme');
    page.setDecoy(0, 'poire');
    page.addDecoy();
    page.setDecoy(1, 'voiture');
    fixture.detectChanges();

    const save = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).filter(
      (button) => button.textContent?.includes('Enregistrer'),
    );
    save[save.length - 1]?.click();

    const req = http.expectOne(questionsUrl);
    expect(req.request.body).toEqual({
      formCode: 'case_vide',
      prompt: 'Complète.',
      sentence: 'Le chat mange une ___ dans le jardin.',
      answers: [{ label: 'pomme' }],
      decoys: [
        { label: 'poire' },
        { label: 'voiture' },
      ],
    });
    req.flush({
      id: 12,
      formCode: 'case_vide',
      formLabel: 'Case vide',
      prompt: 'Complète.',
      sentence: 'Le chat mange une ___ dans le jardin.',
      choices: [],
      pairs: [],
      items: [],
      statements: [],
      links: [],
      answers: [{ id: 1, label: 'pomme' }],
      decoys: [
        { id: 2, label: 'poire' },
        { id: 3, label: 'voiture' },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Complète.');
    expect(fixture.nativeElement.textContent).toContain('Le chat mange une ___ dans le jardin.');
    expect(fixture.nativeElement.textContent).toContain('pomme');
    expect(fixture.nativeElement.textContent).toContain('poire');
    expect(fixture.nativeElement.textContent).toContain('voiture');
  });

  it('removes an extra row and the hole that matches it', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [
        { code: 'qcm', label: 'Choix multiples', sortOrder: 1 },
        { code: 'memory', label: 'Memory', sortOrder: 2 },
        { code: 'order', label: 'Ordre', sortOrder: 3 },
        { code: 'vrai_faux', label: 'Vrai ou faux', sortOrder: 4 },
        { code: 'liens', label: 'Liens', sortOrder: 5 },
        { code: 'case_vide', label: 'Case vide', sortOrder: 6 },
      ],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();

    const page = fixture.componentInstance;
    buttonNamed('Choix multiples')?.click();
    fixture.detectChanges();
    page.addChoice();
    fixture.detectChanges();
    buttonsNamed('Enlever')[2]?.click();
    fixture.detectChanges();
    expect(page.choices().length).toBe(2);

    buttonNamed('Memory')?.click();
    fixture.detectChanges();
    page.addPair();
    buttonsNamed('Enlever')[0]?.click();
    fixture.detectChanges();
    expect(page.pairs().length).toBe(2);

    buttonNamed('Ordre')?.click();
    fixture.detectChanges();
    page.addItem();
    buttonsNamed('Enlever')[0]?.click();
    fixture.detectChanges();
    expect(page.items().length).toBe(2);

    buttonNamed('Vrai ou faux')?.click();
    fixture.detectChanges();
    page.addStatement();
    buttonsNamed('Enlever')[0]?.click();
    fixture.detectChanges();
    expect(page.statements().length).toBe(2);

    buttonNamed('Liens')?.click();
    fixture.detectChanges();
    page.addLink();
    buttonsNamed('Enlever')[0]?.click();
    fixture.detectChanges();
    expect(page.links().length).toBe(2);

    buttonNamed('Case vide')?.click();
    fixture.detectChanges();
    page.setSentence('Le ___ mange une ___.');
    page.setAnswer(0, 'chat');
    page.setAnswer(1, 'pomme');
    page.setDecoy(0, 'poire');
    page.addDecoy();
    page.setDecoy(1, 'voiture');
    fixture.detectChanges();
    buttonsNamed('Enlever')[0]?.click();
    fixture.detectChanges();
    buttonsNamed('Enlever').at(-1)?.click();
    fixture.detectChanges();

    expect(page.sentence()).toBe('Le mange une ___.');
    expect(page.answers()).toEqual([{ label: 'pomme' }]);
    expect(page.decoys()).toEqual([{ label: 'poire' }]);
    expect(fixture.nativeElement.textContent).toContain('Énoncé');
  });

  function buttonsNamed(label: string): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).filter(
      (button) => button.textContent?.includes(label),
    );
  }

  it('copies the selected questions onto another subject', () => {
    fixture.componentInstance.destinations = [
      { id: 4, label: 'École — CE1 — Maths' },
      { id: 9, label: 'École — CE2 — Histoire' },
    ];
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'qcm', label: 'Choix multiples', sortOrder: 1 }],
    });
    http.expectOne(questionsUrl).flush({
      questions: [
        {
          id: 7,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: '2 + 2',
          choices: [{ id: 1, label: '4', correct: true }],
        },
        {
          id: 8,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: '3 + 3',
          choices: [{ id: 2, label: '6', correct: true }],
        },
      ],
    });
    fixture.detectChanges();

    expect(buttonNamed('Copier')?.disabled).toBe(true);
    expect(fixture.componentInstance.destinationLabel({ id: 9, label: 'École — CE2 — Histoire' })).toBe(
      'École — CE2 — Histoire',
    );

    fixture.componentInstance.toggleSelected(7, true);
    fixture.componentInstance.toggleSelected(8, true);
    fixture.componentInstance.setTarget(9);
    fixture.detectChanges();
    expect(buttonNamed('Copier')?.disabled).toBe(false);

    buttonNamed('Copier')?.click();

    const req = http.expectOne(`${questionsUrl}/clone`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ targetSubjectId: 9, questionIds: [7, 8] });
    req.flush({
      questions: [
        {
          id: 21,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: 'copie seule',
          choices: [{ id: 3, label: '4', correct: true }],
        },
        {
          id: 22,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: 'autre copie',
          choices: [{ id: 4, label: '6', correct: true }],
        },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Questions copiées.');
    expect(fixture.nativeElement.textContent).not.toContain('copie seule');
    expect(fixture.nativeElement.textContent).toContain('2 + 2');
  });

  it('appends a copy kept on the same subject', () => {
    fixture.componentInstance.destinations = [{ id: 4, label: 'École — CE1 — Maths' }];
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'qcm', label: 'Choix multiples', sortOrder: 1 }],
    });
    http.expectOne(questionsUrl).flush({
      questions: [
        {
          id: 7,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: '2 + 2',
          choices: [{ id: 1, label: '4', correct: true }],
        },
      ],
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.destinationLabel({ id: 4, label: 'École — CE1 — Maths' })).toBe(
      'École — CE1 — Maths (cette matière)',
    );
    fixture.componentInstance.toggleSelected(7, true);
    fixture.componentInstance.setTarget(4);
    fixture.detectChanges();
    buttonNamed('Copier')?.click();

    const req = http.expectOne(`${questionsUrl}/clone`);
    expect(req.request.body).toEqual({ targetSubjectId: 4, questionIds: [7] });
    req.flush({
      questions: [
        {
          id: 21,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: '2 + 2',
          choices: [{ id: 3, label: '4', correct: true }],
        },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Question copiée.');
    expect(fixture.nativeElement.textContent.match(/2 \+ 2/g)?.length).toBe(2);
  });

  it('shows who follows the course before deleting the selected questions', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'qcm', label: 'Choix multiples', sortOrder: 1 }],
    });
    http.expectOne(questionsUrl).flush({
      questions: [
        {
          id: 7,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: '2 + 2',
          choices: [{ id: 1, label: '4', correct: true }],
        },
        {
          id: 8,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: '3 + 3',
          choices: [{ id: 2, label: '6', correct: true }],
        },
      ],
    });
    fixture.detectChanges();

    fixture.componentInstance.toggleSelected(7, true);
    fixture.componentInstance.toggleSelected(8, true);
    fixture.detectChanges();
    buttonNamed('Supprimer')?.click();

    const followers = http.expectOne('http://localhost:8080/api/int/teacher/subjects/4/followers');
    expect(followers.request.method).toBe('GET');
    followers.flush({
      childCount: 2,
      warning: '2 enfants suivent ce cours.',
      names: ['Léa Martin', 'Nina Bernard'],
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('2 enfants suivent ce cours.');
    expect(text).toContain('Léa Martin');
    expect(text).toContain('Nina Bernard');
    expect(text).toContain('2 + 2');

    buttonNamed('Confirmer la suppression')?.click();
    const deleted = http.expectOne(`${questionsUrl}/delete`);
    expect(deleted.request.method).toBe('POST');
    expect(deleted.request.body).toEqual({ questionIds: [7, 8] });
    deleted.flush({ deletedIds: [7, 8] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('2 + 2');
    expect(fixture.nativeElement.textContent).toContain('Questions supprimées.');
  });

  it('does not delete when the teacher cancels after seeing the children', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'qcm', label: 'Choix multiples', sortOrder: 1 }],
    });
    http.expectOne(questionsUrl).flush({
      questions: [
        {
          id: 7,
          formCode: 'qcm',
          formLabel: 'Choix multiples',
          prompt: '2 + 2',
          choices: [{ id: 1, label: '4', correct: true }],
        },
      ],
    });
    fixture.detectChanges();

    buttonsNamed('Supprimer')[1]?.click();
    http.expectOne('http://localhost:8080/api/int/teacher/subjects/4/followers').flush({
      childCount: 0,
      warning: 'Aucun enfant ne suit ce cours.',
      names: [],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aucun enfant ne suit ce cours.');
    buttonNamed('Annuler la suppression')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 + 2');
    expect(fixture.nativeElement.textContent).not.toContain('Aucun enfant ne suit ce cours.');
  });

  it('posts a free text prompt and its expected answer', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'texte', label: 'Réponse libre', sortOrder: 11 }],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.setPrompt('Capitale de la France');
    page.setExpectedAnswer('Paris');
    fixture.detectChanges();

    buttonNamed('Enregistrer')?.click();

    const req = http.expectOne(questionsUrl);
    expect(req.request.body).toEqual({
      formCode: 'texte',
      prompt: 'Capitale de la France',
      expectedAnswer: 'Paris',
    });
    req.flush({
      id: 13,
      formCode: 'texte',
      formLabel: 'Réponse libre',
      prompt: 'Capitale de la France',
      expectedAnswer: 'Paris',
      choices: [],
      pairs: [],
      items: [],
      statements: [],
      links: [],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Réponse libre');
    expect(fixture.nativeElement.textContent).toContain('Capitale de la France');
    expect(fixture.nativeElement.textContent).toContain('Paris');

    buttonNamed('Modifier')?.click();
    fixture.detectChanges();
    expect(page.prompt()).toBe('Capitale de la France');
    expect(page.expectedAnswer()).toBe('Paris');
    expect(page.editingId()).toBe(13);
  });

  it('posts a click image with its zones and the rule', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'image_interactive', label: 'Image à cliquer', sortOrder: 8 }],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.selectForm('image_interactive');
    page.setPrompt('Trouve le soleil');
    page.setClickImage('data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAA=');
    page.setRequireAllCorrect(true);
    page.setClickZones([
      {
        label: 'le soleil',
        correct: true,
        shape: 'polygon',
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.3, y: 0.2 },
          { x: 0.2, y: 0.4 },
        ],
      },
      {
        label: 'le nuage',
        correct: false,
        shape: 'rect',
        points: [
          { x: 0.5, y: 0.55 },
          { x: 0.8, y: 0.75 },
        ],
      },
    ]);
    fixture.detectChanges();

    buttonNamed('Enregistrer')?.click();

    const req = http.expectOne(questionsUrl);
    expect(req.request.body).toEqual({
      formCode: 'image_interactive',
      prompt: 'Trouve le soleil',
      imageWebp: 'UklGRiQAAABXRUJQVlA4IBgAAAA=',
      requireAllCorrect: true,
      zones: [
        {
          label: 'le soleil',
          correct: true,
          shape: 'polygon',
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.3, y: 0.2 },
            { x: 0.2, y: 0.4 },
          ],
        },
        {
          label: 'le nuage',
          correct: false,
          shape: 'rect',
          points: [
            { x: 0.5, y: 0.55 },
            { x: 0.8, y: 0.75 },
          ],
        },
      ],
    });
    req.flush({
      id: 14,
      formCode: 'image_interactive',
      formLabel: 'Image à cliquer',
      prompt: 'Trouve le soleil',
      imageWebp: 'UklGRiQAAABXRUJQVlA4IBgAAAA=',
      requireAllCorrect: true,
      zones: [
        {
          id: 1,
          label: 'le soleil',
          correct: true,
          shape: 'polygon',
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.3, y: 0.2 },
            { x: 0.2, y: 0.4 },
          ],
        },
      ],
      choices: [],
      pairs: [],
      items: [],
      statements: [],
      links: [],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Image à cliquer');
    expect(fixture.nativeElement.textContent).toContain('le soleil');
    expect(fixture.nativeElement.querySelector('polygon.correct')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Toutes les zones correctes sont à cliquer.');
  });

  it('posts a puzzle with named pieces and no correct side', () => {
    fixture.detectChanges();
    http.expectOne(formsUrl).flush({
      forms: [{ code: 'puzzle', label: 'Puzzle', sortOrder: 10 }],
    });
    http.expectOne(questionsUrl).flush({ questions: [] });
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.selectForm('puzzle');
    page.setPrompt('Reconstitue le dessin');
    page.setClickImage('data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAA=');
    page.setClickZones([
      {
        label: 'le ciel',
        correct: true,
        shape: 'rect',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0.5 },
        ],
      },
      {
        label: 'le sol',
        correct: false,
        shape: 'ellipse',
        points: [
          { x: 0.5, y: 0.75 },
          { x: 0.7, y: 0.9 },
        ],
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Correcte');
    expect(fixture.nativeElement.textContent).not.toContain('Incorrecte');
    expect(fixture.nativeElement.querySelector('polygon.correct, rect.correct, ellipse.correct')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Magnétisme');

    buttonNamed('Enregistrer')?.click();

    const req = http.expectOne(questionsUrl);
    expect(req.request.body).toEqual({
      formCode: 'puzzle',
      prompt: 'Reconstitue le dessin',
      imageWebp: 'UklGRiQAAABXRUJQVlA4IBgAAAA=',
      snapDistance: 0.08,
      pieces: [
        {
          label: 'le ciel',
          shape: 'rect',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0.5 },
          ],
        },
        {
          label: 'le sol',
          shape: 'ellipse',
          points: [
            { x: 0.5, y: 0.75 },
            { x: 0.7, y: 0.9 },
          ],
        },
      ],
    });
    req.flush({
      id: 15,
      formCode: 'puzzle',
      formLabel: 'Puzzle',
      prompt: 'Reconstitue le dessin',
      imageWebp: 'UklGRiQAAABXRUJQVlA4IBgAAAA=',
      pieces: [
        {
          id: 1,
          label: 'le ciel',
          shape: 'rect',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0.5 },
          ],
        },
        {
          id: 2,
          label: 'le sol',
          shape: 'ellipse',
          points: [
            { x: 0.5, y: 0.75 },
            { x: 0.7, y: 0.9 },
          ],
        },
      ],
      choices: [],
      pairs: [],
      items: [],
      statements: [],
      links: [],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Puzzle');
    expect(fixture.nativeElement.textContent).toContain('le ciel');
    expect(fixture.nativeElement.querySelector('polygon.correct, rect.correct, ellipse.correct')).toBeNull();
  });

  function buttonNamed(label: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.includes(label),
    );
  }
});

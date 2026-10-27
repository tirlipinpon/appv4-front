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

  function buttonNamed(label: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.includes(label),
    );
  }
});

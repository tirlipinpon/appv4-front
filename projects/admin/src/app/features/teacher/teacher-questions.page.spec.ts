import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { TeacherSubjectsResponse } from '../../core/api/api-models';
import { TeacherQuestionsPage } from './teacher-questions.page';

const subjectsUrl = 'http://localhost:8080/api/int/teacher/subjects';
const formsUrl = 'http://localhost:8080/api/int/teacher/question-forms';
const questionsUrl = 'http://localhost:8080/api/int/teacher/subjects/3/questions';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';
const accountUrl = 'http://localhost:8080/api/int/auth/me';

const loaded: TeacherSubjectsResponse = {
  schools: [
    {
      schoolId: 1,
      schoolName: 'École française',
      grades: [
        {
          grade: 'CE2',
          subjects: [{ id: 3, name: 'Mathématiques', active: true, ownedByMe: true, sharedWith: [] }],
        },
      ],
    },
  ],
};

describe('TeacherQuestionsPage', () => {
  let fixture: ComponentFixture<TeacherQuestionsPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherQuestionsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherQuestionsPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('affiche la question de la matière et le formulaire', () => {
    fixture.detectChanges();
    http.expectOne(subjectsUrl).flush(loaded);
    http.expectOne(spacesUrl).flush({ roles: ['teacher'], teacherRequest: 'none' });
    http.expectOne(accountUrl).flush({ displayName: 'Anne' });
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
          prompt: 'Combien font 2 + 2 ?',
          choices: [
            { id: 1, label: '3', correct: false },
            { id: 2, label: '4', correct: true },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Mathématiques');
    expect(text).toContain('Combien font 2 + 2 ?');
    expect(text).toContain('Choix multiples');
    expect(text).toContain('3');
    expect(text).toContain('4');
    expect(text).toContain('Bonne réponse');
    expect(text).toContain('Énoncé');
    expect(text).not.toContain('Transférer');
  });
});

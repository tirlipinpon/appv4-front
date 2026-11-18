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

  it('affiche vrai_faux en carte et envoie la réponse API', () => {
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
    expect(root.querySelector('[data-testid="play-true-false"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="play-statement-card-1"]')?.textContent).toContain('2 + 2 = 4');

    const trueBtn = root.querySelector('[data-testid="play-statement-1-true"]') as HTMLButtonElement;
    const falseBtn = root.querySelector('[data-testid="play-statement-2-false"]') as HTMLButtonElement;
    trueBtn.click();
    falseBtn.click();
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
});

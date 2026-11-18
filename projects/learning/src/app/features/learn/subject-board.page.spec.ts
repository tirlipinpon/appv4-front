import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { SubjectBoardPage } from './subject-board.page';

describe('SubjectBoardPage', () => {
  function setup(subjectId = '5') {
    TestBed.configureTestingModule({
      imports: [SubjectBoardPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ChildAuthService,
          useValue: { getToken: () => 'child-token' },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ subjectId }),
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(SubjectBoardPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, http };
  }

  it('affiche nom, grade et lien questions depuis /api/ext/subjects/{id}', () => {
    const { fixture, http } = setup();
    const req = http.expectOne('http://localhost:8080/api/ext/subjects/5');
    expect(req.request.headers.get('Authorization')).toBe('Bearer child-token');
    req.flush({
      subjectId: 5,
      name: 'Mathématiques',
      iconCode: 'math',
      grade: 'CE1',
      xpEarned: 0,
      badgeCount: 0,
      lessonsCompleted: 0,
      lessonsTotal: 0,
      continueLesson: null,
      topics: [],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="subject-board-title"]')?.textContent).toContain('Mathématiques');
    expect(root.querySelector('[data-testid="subject-board-grade"]')?.textContent).toContain('CE1');
    expect(root.querySelector('[data-testid="subject-board-world"]')).toBeNull();
    expect(root.querySelector('[data-testid="subject-board-topics"]')).toBeNull();
    expect(root.querySelector('[data-testid="subject-board-continue"]')).toBeNull();
    const questionsLink: HTMLAnchorElement | null = root.querySelector('[data-testid="subject-board-questions"]');
    expect(questionsLink?.getAttribute('href')).toBe('/learn/5/questions');
    http.verify();
  });

  it('affiche une erreur API 404', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5').flush(
      { message: 'Matière introuvable.' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="subject-board-error"]')?.textContent).toContain(
      'Matière introuvable.',
    );
    http.verify();
  });
});

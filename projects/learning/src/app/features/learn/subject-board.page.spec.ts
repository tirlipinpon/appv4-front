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

  it('affiche hero, Continuer et thèmes renvoyés par /api/ext/subjects/{id}', () => {
    const { fixture, http } = setup();
    const req = http.expectOne('http://localhost:8080/api/ext/subjects/5');
    expect(req.request.headers.get('Authorization')).toBe('Bearer child-token');
    req.flush({
      subjectId: 5,
      name: 'Mathématiques',
      iconCode: 'math',
      grade: 'CE1',
      description: 'Nombres et formes',
      tagline: 'On compte',
      worldLabel: 'MONDE MATHS',
      ageLabel: '5–9 ans',
      levelLabel: 'Facile',
      xpEarned: 120,
      badgeCount: 0,
      lessonsCompleted: 1,
      lessonsTotal: 4,
      minutesLeft: 12,
      continueLesson: {
        lessonId: 21,
        title: "Compter jusqu'à 20",
        progressPercent: 50,
        minutesLeft: 3,
        rewardXp: 50,
        playQuestionId: 102,
      },
      topics: [
        { topicId: 1, name: 'Nombres', iconCode: 'math', lessonsCompleted: 1, lessonsTotal: 2 },
        { topicId: 2, name: 'Calcul', iconCode: 'knowledge', lessonsCompleted: 0, lessonsTotal: 2 },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="subject-board-title"]')?.textContent).toContain('Mathématiques');
    expect(root.querySelector('[data-testid="subject-board-world"]')?.textContent).toContain('MONDE MATHS');
    expect(root.querySelector('[data-testid="subject-board-progress"]')).toBeTruthy();
    expect(root.textContent).toContain('1 / 4 leçons');
    expect(root.querySelector('[data-testid="subject-board-resume-title"]')?.textContent).toContain(
      "Compter jusqu'à 20",
    );
    const continueLink: HTMLAnchorElement | null = root.querySelector('[data-testid="subject-board-continue"]');
    expect(continueLink?.getAttribute('href')).toBe('/learn/5/play/102');
    expect(root.textContent).toContain('Nombres');
    expect(root.textContent).toContain('1 / 2 leçons');
    http.verify();
  });

  it('masque Continuer quand continueLesson est absent', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5').flush({
      subjectId: 5,
      name: 'Maths',
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

    expect(fixture.nativeElement.querySelector('[data-testid="subject-board-continue"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="subject-board-topics-empty"]')).toBeTruthy();
    http.verify();
  });
});

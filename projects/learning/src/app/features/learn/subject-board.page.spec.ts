import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { ChildTrailNames } from '../shell/child-trail';
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
    expect(TestBed.inject(ChildTrailNames).subjectName()).toBe('Mathématiques');
    expect(root.querySelector('[data-testid="subject-board-grade"]')?.textContent).toContain('CE1');
    expect(root.querySelector('[data-testid="subject-board-world"]')).toBeNull();
    expect(root.querySelector('[data-testid="subject-board-topics"]')).toBeNull();
    expect(root.querySelector('[data-testid="subject-board-continue"]')).toBeNull();
    const questionsLink: HTMLAnchorElement | null = root.querySelector('[data-testid="subject-board-questions"]');
    expect(questionsLink?.getAttribute('href')).toBe('/learn/5/questions');
    expect(root.querySelector('[data-testid="subject-board-lesson"]')).toBeNull();
    http.verify();
  });

  it('ne dessine pas la leçon tant que la lecture est en cours', () => {
    const { fixture, http } = setup();
    expect(fixture.nativeElement.querySelector('[data-testid="subject-board-lesson"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="subject-board-loading"]')).not.toBeNull();
    http.expectOne('http://localhost:8080/api/ext/subjects/5').flush({
      subjectId: 5,
      name: 'Mathématiques',
      lesson: { remainingCount: 0, questions: [] },
    });
    http.verify();
  });

  it('affiche le compte, les énoncés et les étoiles reçus, dans l’ordre', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5').flush({
      subjectId: 5,
      name: 'Mathématiques',
      grade: 'CE1',
      lesson: {
        remainingCount: 2,
        questions: [
          {
            questionId: 11,
            formCode: 'qcm',
            prompt: 'Combien font 2 + 2 ?',
            formLabel: 'Choix multiples',
            iconCode: 'checklist',
            color: '#4c6fff',
            mark: 'black',
            yellowCount: 0,
          },
          {
            questionId: 12,
            formCode: 'qcm',
            prompt: 'Combien font 3 + 1 ?',
            formLabel: 'Choix multiples',
            iconCode: 'checklist',
            color: '#4c6fff',
            mark: 'yellow',
            yellowCount: 3,
          },
        ],
      },
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="subject-board-lesson-count"]')?.textContent).toContain('2');
    const rows = root.querySelectorAll('[data-testid^="subject-board-lesson-"]');
    const links = [...rows].filter((node) => node.tagName === 'A') as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/learn/5/play/11',
      '/learn/5/play/12',
    ]);
    expect(links.map((link) => link.textContent)).toEqual([
      jasmine.stringContaining('Combien font 2 + 2 ?'),
      jasmine.stringContaining('Combien font 3 + 1 ?'),
    ]);
    expect(links[0].textContent).toContain('Choix multiples');
    expect(links[0].className).toContain('row');
    expect(links[0].className).toContain('playable');
    expect(links[0].querySelector('[data-testid="lesson-star"]')?.className).toContain('star-black');
    expect(links[0].querySelector('[data-testid="lesson-yellow-count"]')).toBeNull();
    expect(links[1].querySelector('[data-testid="lesson-star"]')?.className).toContain('star-yellow');
    expect(links[1].querySelector('[data-testid="lesson-yellow-count"]')?.textContent).toContain('3');
    expect(root.querySelector('[data-testid="subject-board-questions"]')?.getAttribute('href')).toBe(
      '/learn/5/questions',
    );
    http.verify();
  });

  it('laisse la section vide quand le compte reçu est 0', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5').flush({
      subjectId: 5,
      name: 'Mathématiques',
      lesson: { remainingCount: 0, questions: [] },
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="subject-board-lesson"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="subject-board-lesson-count"]')?.textContent).toContain('0');
    expect(root.querySelector('a[data-testid^="subject-board-lesson-"]')).toBeNull();
    expect(root.querySelector('[data-testid="subject-board-lesson-popup"]')).toBeNull();
    expect(root.querySelector('[data-testid="subject-board-error"]')).toBeNull();
    http.verify();
  });

  it('une erreur API ne dessine pas une leçon vide', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/subjects/5').flush(
      { message: 'Matière introuvable.' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="subject-board-error"]')?.textContent).toContain('Matière introuvable.');
    expect(root.querySelector('[data-testid="subject-board-lesson"]')).toBeNull();
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

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { SubjectQuestionsPage } from './subject-questions.page';

describe('SubjectQuestionsPage', () => {
  function setup() {
    const params = new BehaviorSubject(convertToParamMap({ subjectId: '5' }));
    TestBed.configureTestingModule({
      imports: [SubjectQuestionsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: ChildAuthService, useValue: { getToken: () => 'child-token' } },
      ],
    });
    const fixture = TestBed.createComponent(SubjectQuestionsPage);
    const http = TestBed.inject(HttpTestingController);
    const request = (subjectId: number, afterId: number) => http.expectOne((req) =>
      req.url.endsWith(`/subjects/${subjectId}/questions`) &&
      req.params.get('afterId') === String(afterId) && req.params.get('limit') === '50',
    );
    fixture.detectChanges();
    return { fixture, request, params, http };
  }

  function card(id: number) {
    return { questionId: id, formCode: 'qcm', prompt: `Question ${id}`, formLabel: 'QCM' };
  }

  it('conserve les questions déjà chargées pendant une reprise puis affiche la dernière page', () => {
    const { fixture, request, http } = setup();
    request(5, 0).flush({ subjectId: 5, subjectName: 'Maths', questions: [card(200)], nextCursor: 200 });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[data-testid="subject-questions-next"]')!.click();
    request(5, 200).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="subject-question-200"]')).toBeTruthy();
    root.querySelector<HTMLButtonElement>('[data-testid="subject-questions-retry"]')!.click();
    request(5, 200).flush({
      subjectId: 5, subjectName: 'Maths', questions: [card(201), card(400)], nextCursor: null,
    });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="subject-question-201"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="subject-question-400"]')).toBeTruthy();
    expect(root.querySelectorAll('[data-testid="subject-question-200"]').length).toBe(1);
    expect(root.querySelector('[data-testid="subject-questions-next"]')).toBeNull();
    http.verify();
  });

  it('annule la page de la matière précédente lors de la navigation', () => {
    const { fixture, request, params, http } = setup();
    const previous = request(5, 0);
    params.next(convertToParamMap({ subjectId: '7' }));
    expect(previous.cancelled).toBeTrue();
    request(7, 0).flush({ subjectId: 7, subjectName: 'Sciences', questions: [card(7)], nextCursor: null });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="subject-questions-title"]')?.textContent).toContain('Sciences');
    expect(root.querySelector('[data-testid="subject-question-7"]')).toBeTruthy();
    http.verify();
  });

  it('affiche l’étoile jaune et le compte renvoyés par le serveur', () => {
    const { fixture, request, http } = setup();
    request(5, 0).flush({
      subjectId: 5,
      subjectName: 'Maths',
      questions: [{
        questionId: 12,
        formCode: 'qcm',
        prompt: 'Question 12',
        formLabel: 'QCM',
        mark: 'yellow',
        yellowCount: 3,
      }],
      nextCursor: null,
    });
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="subject-question-12"]')!;
    const star = row.querySelector('[data-testid="question-star"]');
    expect(star?.textContent).toContain('★');
    expect(getComputedStyle(star as HTMLElement).color).toBe('rgb(245, 197, 24)');
    expect(row.querySelector('[data-testid="question-yellow-count"]')?.textContent?.trim()).toBe('3');
    http.verify();
  });

  it('affiche une étoile noire sans compte quand le serveur dit black', () => {
    const { fixture, request, http } = setup();
    request(5, 0).flush({
      subjectId: 5,
      subjectName: 'Maths',
      questions: [{
        questionId: 13,
        formCode: 'qcm',
        prompt: 'Question 13',
        formLabel: 'QCM',
        mark: 'black',
        yellowCount: 4,
      }],
      nextCursor: null,
    });
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="subject-question-13"]')!;
    const star = row.querySelector('[data-testid="question-star"]');
    expect(star?.textContent).toContain('★');
    expect(getComputedStyle(star as HTMLElement).color).toBe('rgb(20, 20, 20)');
    expect(row.querySelector('[data-testid="question-yellow-count"]')).toBeNull();
    expect(row.textContent).not.toContain('4');
    http.verify();
  });

  it('n’affiche pas d’étoile quand le serveur n’en pose pas', () => {
    const { fixture, request, http } = setup();
    request(5, 0).flush({
      subjectId: 5,
      subjectName: 'Maths',
      questions: [
        {
          questionId: 14,
          formCode: 'qcm',
          prompt: 'Question 14',
          formLabel: 'QCM',
          mark: 'none',
          yellowCount: 9,
        },
        {
          questionId: 15,
          formCode: 'qcm',
          prompt: 'Question 15',
          formLabel: 'QCM',
          yellowCount: 8,
        },
      ],
      nextCursor: null,
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const id of [14, 15]) {
      const row = root.querySelector(`[data-testid="subject-question-${id}"]`)!;
      expect(row.querySelector('[data-testid="question-star"]')).toBeNull();
      expect(row.querySelector('[data-testid="question-yellow-count"]')).toBeNull();
    }
    expect(root.textContent).not.toContain('9');
    expect(root.textContent).not.toContain('8');
    http.verify();
  });
});

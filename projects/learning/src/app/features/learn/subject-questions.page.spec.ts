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
});

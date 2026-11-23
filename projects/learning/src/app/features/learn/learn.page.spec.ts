import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { LearnPage } from './learn.page';

describe('LearnPage', () => {
  it('affiche les matières renvoyées par /api/ext/subjects', () => {
    TestBed.configureTestingModule({
      imports: [LearnPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ChildAuthService,
          useValue: {
            getToken: () => 'child-token',
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(LearnPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const request = http.expectOne('http://localhost:8080/api/ext/subjects');
    expect(request.request.headers.get('Authorization')).toBe('Bearer child-token');
    request.flush({
      subjects: [
        {
          subjectId: 4,
          name: 'Mathématiques',
          grade: 'CE1',
          questionCount: 3,
          iconCode: 'math',
        },
      ],
    });
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('[data-testid="learn-subject-4"]');
    expect(card.textContent).toContain('Mathématiques');
    expect(card.textContent).toContain('CE1');
    expect(card.textContent).toContain('3 questions');
    http.verify();
  });
});

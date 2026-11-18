import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  ChildAttemptResultResponse,
  ChildLearningQuestionsResponse,
  ChildPlayQuestionResponse,
  SubmitChildAttemptRequest,
} from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Questions et tentatives enfant (LEARN-30 / BACK-16).
 * Le score vient uniquement de l'API.
 */
@Injectable({ providedIn: 'root' })
export class ChildPlayService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  listQuestions(subjectId: number): Observable<ChildLearningQuestionsResponse> {
    return this.http.get<ChildLearningQuestionsResponse>(
      `${environment.apiBaseUrl}/subjects/${subjectId}/questions`,
      { headers: this.headers() },
    );
  }

  getQuestion(subjectId: number, questionId: number): Observable<ChildPlayQuestionResponse> {
    return this.http.get<ChildPlayQuestionResponse>(
      `${environment.apiBaseUrl}/subjects/${subjectId}/questions/${questionId}`,
      { headers: this.headers() },
    );
  }

  submitAttempt(
    subjectId: number,
    questionId: number,
    body: SubmitChildAttemptRequest,
  ): Observable<ChildAttemptResultResponse> {
    return this.http.post<ChildAttemptResultResponse>(
      `${environment.apiBaseUrl}/subjects/${subjectId}/questions/${questionId}/attempts`,
      body,
      { headers: this.headers() },
    );
  }

  private headers(): { Authorization: string } {
    return { Authorization: `Bearer ${this.auth.getToken() ?? ''}` };
  }
}

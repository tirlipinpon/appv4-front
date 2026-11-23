import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { components } from '@appv4/api';
import type { MemoryMatch, PlayQuestion } from '@appv4/ui';
import type {
  ChildAttemptResultResponse,
  ChildLearningQuestionsResponse,
  ChildLetterLocksResponse,
} from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

type DropPlayId<T> = T extends unknown ? Omit<T, 'playId'> : never;
type ChildAttemptBody = DropPlayId<components['schemas']['SubmitChildAttemptRequest']>;

/**
 * Questions et tentatives enfant (LEARN-30 / BACK-16).
 * Le score vient uniquement de l'API.
 */
@Injectable({ providedIn: 'root' })
export class ChildPlayService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  listQuestions(subjectId: number, afterId: number): Observable<ChildLearningQuestionsResponse> {
    return this.http.get<ChildLearningQuestionsResponse>(
      `${environment.apiBaseUrl}/subjects/${subjectId}/questions`,
      { headers: this.headers(), params: { afterId, limit: 50 } },
    );
  }

  openQuestion(subjectId: number, questionId: number, playId: string | null): Observable<PlayQuestion> {
    return this.http.post<PlayQuestion>(
      `${environment.apiBaseUrl}/subjects/${subjectId}/questions/${questionId}/play`,
      playId ? { playId } : null,
      { headers: this.headers() },
    );
  }

  submitAttempt(
    subjectId: number,
    questionId: number,
    body: ChildAttemptBody,
    playId: string | null,
  ): Observable<ChildAttemptResultResponse> {
    return this.http.post<ChildAttemptResultResponse>(
      `${environment.apiBaseUrl}/subjects/${subjectId}/questions/${questionId}/attempts`,
      playId ? { ...body, playId } : body,
      { headers: this.headers() },
    );
  }

  checkMemoryPair(subjectId: number, questionId: number, match: MemoryMatch) {
    return this.http.post<components['schemas']['MemoryPairResponse']>(
      `${environment.apiBaseUrl}/subjects/${subjectId}/questions/${questionId}/memory-pair`,
      match,
      { headers: this.headers() },
    );
  }

  /** Verrous case par case pendant la saisie lettre (sans tentative). */
  checkLetterLocks(
    subjectId: number,
    questionId: number,
    attempt: string,
  ): Observable<ChildLetterLocksResponse> {
    return this.http.post<ChildLetterLocksResponse>(
      `${environment.apiBaseUrl}/subjects/${subjectId}/questions/${questionId}/letter-locks`,
      { attempt },
      { headers: this.headers() },
    );
  }

  private headers(): { Authorization: string } {
    return { Authorization: `Bearer ${this.auth.getToken() ?? ''}` };
  }
}

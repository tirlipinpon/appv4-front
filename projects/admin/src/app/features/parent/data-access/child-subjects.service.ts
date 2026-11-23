import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AddChildSubjectRequest, ChildSubjectOffer, ParentSubjectsResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Matières des enfants du parent (SCRUM-162), page /parent/matieres.
 */
@Injectable({ providedIn: 'root' })
export class ChildSubjectsService {
  private readonly http = inject(HttpClient);

  load(): Observable<ParentSubjectsResponse> {
    return this.http.get<ParentSubjectsResponse>(this.url());
  }

  add(childId: number, subjectId: number): Observable<ChildSubjectOffer> {
    const body: AddChildSubjectRequest = { childId, subjectId };
    return this.http.post<ChildSubjectOffer>(this.url(), body);
  }

  remove(childId: number, subjectId: number): Observable<ChildSubjectOffer> {
    return this.http.delete<ChildSubjectOffer>(`${this.url()}/${childId}/${subjectId}`);
  }

  search(childId: number, query: string, grade: string, afterId = 0, limit?: number): Observable<{
    offers: ChildSubjectOffer[]; nextCursor: number | null;
  }> {
    const params: Record<string, string | number> = { query, grade, afterId };
    if (limit !== undefined) {
      params['limit'] = limit;
    }
    return this.http.get<{ offers: ChildSubjectOffer[]; nextCursor: number | null }>(
      `${this.url()}/${childId}/offers`, { params },
    );
  }

  private url(): string {
    return `${environment.apiBaseUrl}/parent/subjects`;
  }
}

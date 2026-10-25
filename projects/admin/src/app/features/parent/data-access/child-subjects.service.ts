import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AddChildSubjectRequest, ParentSubjectsResponse } from '../../../core/api/api-models';
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

  add(childId: number, subjectId: number): Observable<ParentSubjectsResponse> {
    const body: AddChildSubjectRequest = { childId, subjectId };
    return this.http.post<ParentSubjectsResponse>(this.url(), body);
  }

  remove(childId: number, subjectId: number): Observable<ParentSubjectsResponse> {
    return this.http.delete<ParentSubjectsResponse>(`${this.url()}/${childId}/${subjectId}`);
  }

  private url(): string {
    return `${environment.apiBaseUrl}/parent/subjects`;
  }
}

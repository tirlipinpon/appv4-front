import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateTeacherSubjectRequest,
  RenameTeacherSubjectRequest,
  TeacherSubjectItem,
  TeacherSubjectsResponse,
} from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Matières du professeur connecté (SCRUM-161).
 * L'écriture en base reste côté API : ce service ne fait qu'envoyer le formulaire.
 */
@Injectable({ providedIn: 'root' })
export class TeacherSubjectsService {
  private readonly http = inject(HttpClient);

  load(): Observable<TeacherSubjectsResponse> {
    return this.http.get<TeacherSubjectsResponse>(`${environment.apiBaseUrl}/teacher/subjects`);
  }

  create(body: CreateTeacherSubjectRequest): Observable<TeacherSubjectItem> {
    return this.http.post<TeacherSubjectItem>(`${environment.apiBaseUrl}/teacher/subjects`, body);
  }

  rename(id: number, body: RenameTeacherSubjectRequest): Observable<TeacherSubjectItem> {
    return this.http.put<TeacherSubjectItem>(`${environment.apiBaseUrl}/teacher/subjects/${id}`, body);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/teacher/subjects/${id}`);
  }
}

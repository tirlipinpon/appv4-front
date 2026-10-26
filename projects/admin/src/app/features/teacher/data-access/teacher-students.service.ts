import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { TeacherStudentsResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Élèves des classes du professeur connecté (SCRUM-160).
 * Lecture seule : la page affiche la réponse, elle n'écrit rien.
 */
@Injectable({ providedIn: 'root' })
export class TeacherStudentsService {
  private readonly http = inject(HttpClient);

  load(): Observable<TeacherStudentsResponse> {
    return this.http.get<TeacherStudentsResponse>(`${environment.apiBaseUrl}/teacher/students`);
  }

  photo(id: number): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/teacher/students/${id}/photo`, {
      responseType: 'blob',
    });
  }
}

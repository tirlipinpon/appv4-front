import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateTeacherSubjectQuestionRequest,
  TeacherQuestionFormsResponse,
  TeacherSubjectQuestionItem,
  TeacherSubjectQuestionsResponse,
} from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Choix multiple d'une matière (SCRUM-174).
 * La liste des formes vient de l'API. Le formulaire n'existe que pour le code renvoyé.
 */
@Injectable({ providedIn: 'root' })
export class TeacherQuestionsService {
  private readonly http = inject(HttpClient);

  forms(): Observable<TeacherQuestionFormsResponse> {
    return this.http.get<TeacherQuestionFormsResponse>(`${environment.apiBaseUrl}/teacher/question-forms`);
  }

  list(subjectId: number): Observable<TeacherSubjectQuestionsResponse> {
    return this.http.get<TeacherSubjectQuestionsResponse>(
      `${environment.apiBaseUrl}/teacher/subjects/${subjectId}/questions`,
    );
  }

  create(subjectId: number, body: CreateTeacherSubjectQuestionRequest): Observable<TeacherSubjectQuestionItem> {
    return this.http.post<TeacherSubjectQuestionItem>(
      `${environment.apiBaseUrl}/teacher/subjects/${subjectId}/questions`,
      body,
    );
  }

  update(
    subjectId: number,
    questionId: number,
    body: CreateTeacherSubjectQuestionRequest,
  ): Observable<TeacherSubjectQuestionItem> {
    return this.http.put<TeacherSubjectQuestionItem>(
      `${environment.apiBaseUrl}/teacher/subjects/${subjectId}/questions/${questionId}`,
      body,
    );
  }
}

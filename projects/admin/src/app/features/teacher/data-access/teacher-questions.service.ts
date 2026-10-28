import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import type {
  CloneTeacherSubjectQuestionsRequest,
  CreateTeacherSubjectQuestionRequest,
  DeleteTeacherSubjectQuestionsRequest,
  DeleteTeacherSubjectQuestionsResponse,
  TeacherQuestionFormsResponse,
  TeacherSubjectFollowersResponse,
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
  private readonly copiedSubject = new Subject<number>();

  /** La matière qui vient de recevoir des copies, pour recharger sa liste. */
  readonly copiedToSubject$ = this.copiedSubject.asObservable();

  noteCopied(subjectId: number): void {
    this.copiedSubject.next(subjectId);
  }

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

  clone(
    subjectId: number,
    body: CloneTeacherSubjectQuestionsRequest,
  ): Observable<TeacherSubjectQuestionsResponse> {
    return this.http.post<TeacherSubjectQuestionsResponse>(
      `${environment.apiBaseUrl}/teacher/subjects/${subjectId}/questions/clone`,
      body,
    );
  }

  /** Enfants qui suivent encore ce cours : nombre, phrase, et noms. */
  followers(subjectId: number): Observable<TeacherSubjectFollowersResponse> {
    return this.http.get<TeacherSubjectFollowersResponse>(
      `${environment.apiBaseUrl}/teacher/subjects/${subjectId}/followers`,
    );
  }

  deleteQuestions(
    subjectId: number,
    body: DeleteTeacherSubjectQuestionsRequest,
  ): Observable<DeleteTeacherSubjectQuestionsResponse> {
    return this.http.post<DeleteTeacherSubjectQuestionsResponse>(
      `${environment.apiBaseUrl}/teacher/subjects/${subjectId}/questions/delete`,
      body,
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateTeacherSubjectRequest,
  DeactivateTeacherSubjectRequest,
  RenameTeacherSubjectRequest,
  TeacherDeactivateNoticesResponse,
  TeacherSubjectColleaguesResponse,
  TeacherSubjectItem,
  TeacherSubjectsResponse,
  TeacherTransferInvitesResponse,
  TransferTeacherSubjectRequest,
} from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Matières du professeur (SCRUM-161, SCRUM-172, SCRUM-189).
 * Transfert : liste de collègues + demande à valider, pas d'email libre.
 * Désactivation : personnelle ; le créateur peut cibler des co-profs.
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

  /** Ramène la matière retirée du même nom dans cette classe (même id). */
  restore(body: CreateTeacherSubjectRequest): Observable<TeacherSubjectItem> {
    return this.http.post<TeacherSubjectItem>(
      `${environment.apiBaseUrl}/teacher/subjects/restore`,
      body,
    );
  }

  rename(id: number, body: RenameTeacherSubjectRequest): Observable<TeacherSubjectItem> {
    return this.http.put<TeacherSubjectItem>(`${environment.apiBaseUrl}/teacher/subjects/${id}`, body);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/teacher/subjects/${id}`);
  }

  deactivate(id: number, body: DeactivateTeacherSubjectRequest = {}): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/teacher/subjects/${id}/deactivate`, body);
  }

  reactivate(id: number): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/teacher/subjects/${id}/reactivate`, null);
  }

  colleagues(id: number): Observable<TeacherSubjectColleaguesResponse> {
    return this.http.get<TeacherSubjectColleaguesResponse>(
      `${environment.apiBaseUrl}/teacher/subjects/${id}/colleagues`,
    );
  }

  transfer(id: number, body: TransferTeacherSubjectRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/teacher/subjects/${id}/transfer`, body);
  }

  transferInvites(): Observable<TeacherTransferInvitesResponse> {
    return this.http.get<TeacherTransferInvitesResponse>(
      `${environment.apiBaseUrl}/teacher/subjects/transfer-invites`,
    );
  }

  acceptTransfer(inviteId: number): Observable<void> {
    return this.http.post<void>(
      `${environment.apiBaseUrl}/teacher/subjects/transfer-invites/${inviteId}/accept`,
      null,
    );
  }

  rejectTransfer(inviteId: number): Observable<void> {
    return this.http.post<void>(
      `${environment.apiBaseUrl}/teacher/subjects/transfer-invites/${inviteId}/reject`,
      null,
    );
  }

  deactivateNotices(): Observable<TeacherDeactivateNoticesResponse> {
    return this.http.get<TeacherDeactivateNoticesResponse>(
      `${environment.apiBaseUrl}/teacher/subjects/deactivate-notices`,
    );
  }

  dismissDeactivateNotice(noticeId: number): Observable<void> {
    return this.http.post<void>(
      `${environment.apiBaseUrl}/teacher/subjects/deactivate-notices/${noticeId}/dismiss`,
      null,
    );
  }
}

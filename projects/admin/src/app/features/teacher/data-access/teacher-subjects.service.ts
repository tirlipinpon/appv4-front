import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateTeacherSubjectRequest,
  RenameTeacherSubjectRequest,
  TeacherDeactivateNoticesResponse,
  TeacherSubjectColleaguesResponse,
  TeacherSubjectFollowersResponse,
  TeacherSubjectItem,
  TeacherSubjectsResponse,
  TeacherTransferInvitesResponse,
  TransferTeacherSubjectRequest,
} from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Matières du professeur (SCRUM-161, SCRUM-172, SCRUM-189).
 * Transfert : liste de collègues + demande à valider, pas d'email libre.
 * Retrait : la matière quitte sa liste ; le dernier détenteur peut proposer un déplacement.
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

  /** Demande au créateur de partager une matière déjà existante (même id après acceptation). */
  requestShare(body: CreateTeacherSubjectRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/teacher/subjects/share-requests`, body);
  }

  rename(id: number, body: RenameTeacherSubjectRequest): Observable<TeacherSubjectItem> {
    return this.http.put<TeacherSubjectItem>(`${environment.apiBaseUrl}/teacher/subjects/${id}`, body);
  }

  /** Retire la matière de la liste de ce professeur. */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/teacher/subjects/${id}`);
  }

  reactivate(id: number): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/teacher/subjects/${id}/reactivate`, null);
  }

  /** Enfants qui suivent encore cette matière : phrase et noms, avant retrait. */
  followers(id: number): Observable<TeacherSubjectFollowersResponse> {
    return this.http.get<TeacherSubjectFollowersResponse>(
      `${environment.apiBaseUrl}/teacher/subjects/${id}/followers`,
    );
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

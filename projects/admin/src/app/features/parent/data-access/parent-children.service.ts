import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateParentChildRequest,
  InvitationReceiptResponse,
  ParentChildResponse,
  ParentChildrenResponse,
  PendingInvitationResponse,
} from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Enfants du parent connecté (SCRUM-156).
 * Le front envoie le formulaire. La base est écrite par l'API.
 */
@Injectable({ providedIn: 'root' })
export class ParentChildrenService {
  private readonly http = inject(HttpClient);

  load(): Observable<ParentChildrenResponse> {
    return this.http.get<ParentChildrenResponse>(`${environment.apiBaseUrl}/parent/children`);
  }

  add(body: CreateParentChildRequest): Observable<ParentChildResponse> {
    return this.http.post<ParentChildResponse>(`${environment.apiBaseUrl}/parent/children`, body);
  }

  update(id: number, body: CreateParentChildRequest): Observable<ParentChildResponse> {
    return this.http.put<ParentChildResponse>(`${environment.apiBaseUrl}/parent/children/${id}`, body);
  }

  deactivate(id: number): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/parent/children/${id}/deactivate`, null);
  }

  reactivate(id: number): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/parent/children/${id}/reactivate`, null);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/parent/children/${id}`);
  }

  suggestInterests(query: string): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiBaseUrl}/parent/interest-suggestions`, {
      params: { query },
    });
  }

  invitations(): Observable<PendingInvitationResponse[]> {
    return this.http.get<PendingInvitationResponse[]>(`${environment.apiBaseUrl}/parent/children/invitations`);
  }

  invite(id: number, email: string): Observable<InvitationReceiptResponse> {
    return this.http.post<InvitationReceiptResponse>(
      `${environment.apiBaseUrl}/parent/children/${id}/invitations`,
      { email },
    );
  }

  acceptInvitation(id: number): Observable<ParentChildResponse> {
    return this.http.post<ParentChildResponse>(
      `${environment.apiBaseUrl}/parent/children/invitations/${id}/accept`,
      null,
    );
  }

  photo(id: number): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/parent/children/${id}/photo`, {
      responseType: 'blob',
    });
  }
}

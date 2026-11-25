import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateParentChildRequest,
  InvitationReceiptResponse,
  ParentChildResponse,
  ParentChildrenResponse,
  PendingInvitationResponse,
  FicheHolderResponse,
  SaveParentRankingRequest,
  ShareRequestResponse,
  TransferResponse,
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

  saveRanking(id: number, body: SaveParentRankingRequest): Observable<ParentChildResponse> {
    return this.http.put<ParentChildResponse>(`${environment.apiBaseUrl}/parent/children/${id}/ranking`, body);
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

  shareRequests(): Observable<ShareRequestResponse[]> {
    return this.http.get<ShareRequestResponse[]>(`${environment.apiBaseUrl}/parent/children/demandes`);
  }

  requestShare(email: string, firstName: string, lastName: string): Observable<InvitationReceiptResponse> {
    return this.http.post<InvitationReceiptResponse>(`${environment.apiBaseUrl}/parent/children/demandes`, {
      email,
      firstName,
      lastName,
    });
  }

  acceptShare(id: number, childId: number): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/parent/children/demandes/${id}/accept`, { childId });
  }

  refuseShare(id: number): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/parent/children/demandes/${id}/refuse`, null);
  }

  holders(id: number): Observable<FicheHolderResponse[]> {
    return this.http.get<FicheHolderResponse[]>(`${environment.apiBaseUrl}/parent/children/${id}/holders`);
  }

  transfers(): Observable<TransferResponse[]> {
    return this.http.get<TransferResponse[]>(`${environment.apiBaseUrl}/parent/children/transferts`);
  }

  startTransfer(id: number, holderUserId: number, message: string): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/parent/children/${id}/transferts`, {
      holderUserId,
      message,
    });
  }

  acceptTransfer(id: number): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/parent/children/transferts/${id}/accept`, null);
  }

  refuseTransfer(id: number): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/parent/children/transferts/${id}/refuse`, null);
  }

  cancelTransfer(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/parent/children/transferts/${id}`);
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

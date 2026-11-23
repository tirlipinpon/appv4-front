import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { ConnectedAccountResponse, RecoveryPromptRequest } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Lecture et réponse de la sollicitation de contact.
 * La phrase vient de GET /auth/me. L'écran ne l'écrit pas.
 */
@Injectable({ providedIn: 'root' })
export class RecoveryPromptService {
  private readonly http = inject(HttpClient);

  load(): Observable<ConnectedAccountResponse> {
    return this.http.get<ConnectedAccountResponse>(`${environment.apiBaseUrl}/auth/me`);
  }

  answer(body: RecoveryPromptRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/auth/recovery-prompt`, body);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  RecoverIdentifierRequest,
  RecoverIdentifierResponse,
} from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Data-access récupération de l'identifiant.
 * L'écran affiche le masque ou la phrase renvoyés. Il ne les calcule pas.
 */
@Injectable({ providedIn: 'root' })
export class AccountRecoveryService {
  private readonly http = inject(HttpClient);

  recover(body: RecoverIdentifierRequest): Observable<RecoverIdentifierResponse> {
    return this.http.post<RecoverIdentifierResponse>(
      `${environment.apiBaseUrl}/auth/recover-identifier`,
      body,
    );
  }
}

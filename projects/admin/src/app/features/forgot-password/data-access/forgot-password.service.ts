import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AuthMessageResponse, ForgotPasswordRequest } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Data-access mot de passe oublié (SCRUM-109) — POST /auth/forgot-password.
 * Message API toujours générique (anti-énumération).
 */
@Injectable({ providedIn: 'root' })
export class ForgotPasswordService {
  private readonly http = inject(HttpClient);

  requestReset(email: string): Observable<AuthMessageResponse> {
    const body: ForgotPasswordRequest = { email };
    return this.http.post<AuthMessageResponse>(
      `${environment.apiBaseUrl}/auth/forgot-password`,
      body,
    );
  }
}

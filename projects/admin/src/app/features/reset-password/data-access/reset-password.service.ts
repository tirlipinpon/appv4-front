import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AuthMessageResponse, ResetPasswordRequest } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Data-access renew mdp (SCRUM-112) — POST /auth/reset-password.
 */
@Injectable({ providedIn: 'root' })
export class ResetPasswordService {
  private readonly http = inject(HttpClient);

  reset(token: string, newPassword: string): Observable<AuthMessageResponse> {
    const body: ResetPasswordRequest = { token, newPassword };
    return this.http.post<AuthMessageResponse>(
      `${environment.apiBaseUrl}/auth/reset-password`,
      body,
    );
  }
}

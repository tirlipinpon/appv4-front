import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

/**
 * Data-access renew mdp (SCRUM-112) — POST /auth/reset-password.
 */
@Injectable({ providedIn: 'root' })
export class ResetPasswordService {
  private readonly http = inject(HttpClient);

  reset(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/auth/reset-password`, {
      token,
      newPassword,
    });
  }
}

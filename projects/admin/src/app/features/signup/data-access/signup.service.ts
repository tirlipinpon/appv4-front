import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

/**
 * Data-access inscription email/mdp (SCRUM-106) — appelle POST /auth/signup.
 */
@Injectable({ providedIn: 'root' })
export class SignupService {
  private readonly http = inject(HttpClient);

  signup(
    email: string,
    password: string,
    displayName?: string,
  ): Observable<{ token: string; expiresAtEpochSeconds: number }> {
    return this.http.post<{ token: string; expiresAtEpochSeconds: number }>(
      `${environment.apiBaseUrl}/auth/signup`,
      { email, password, displayName: displayName?.trim() || undefined },
    );
  }
}

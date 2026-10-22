import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

/**
 * Data-access login Google (SCRUM-97) — aucun secret Google côté front.
 */
@Injectable({ providedIn: 'root' })
export class GoogleOAuthService {
  private readonly http = inject(HttpClient);

  /** Redirect FE enregistré dans Google Cloud (local). */
  readonly redirectUri = `${window.location.origin}/auth/callback/google`;

  getAuthorizeUrl(): Observable<{ authorizationUrl: string }> {
    return this.http.get<{ authorizationUrl: string }>(
      `${environment.apiBaseUrl}/auth/oauth/google/authorize-url`,
      { params: { redirectUri: this.redirectUri } },
    );
  }

  exchangeCode(authorizationCode: string): Observable<{ token: string; expiresAtEpochSeconds: number }> {
    return this.http.post<{ token: string; expiresAtEpochSeconds: number }>(
      `${environment.apiBaseUrl}/auth/oauth/google`,
      {
        authorizationCode,
        redirectUri: this.redirectUri,
      },
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

/**
 * Data-access login Facebook (SCRUM-100) — aucun secret Meta côté front.
 */
@Injectable({ providedIn: 'root' })
export class FacebookOAuthService {
  private readonly http = inject(HttpClient);

  /** Redirect FE enregistré dans Meta for Developers (local). */
  readonly redirectUri = `${window.location.origin}/auth/callback/facebook`;

  getAuthorizeUrl(): Observable<{ authorizationUrl: string }> {
    return this.http.get<{ authorizationUrl: string }>(
      `${environment.apiBaseUrl}/auth/oauth/facebook/authorize-url`,
      { params: { redirectUri: this.redirectUri } },
    );
  }

  exchangeCode(authorizationCode: string): Observable<{ token: string; expiresAtEpochSeconds: number }> {
    return this.http.post<{ token: string; expiresAtEpochSeconds: number }>(
      `${environment.apiBaseUrl}/auth/oauth/facebook`,
      {
        authorizationCode,
        redirectUri: this.redirectUri,
      },
    );
  }
}

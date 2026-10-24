import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type {
  AuthorizeUrlResponse,
  GoogleLoginRequest,
  JwtTokenResponse,
} from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';
import { storeOAuthState } from './oauth-browser-state';

/**
 * Data-access login Google (SCRUM-97) — aucun secret Google côté front.
 */
@Injectable({ providedIn: 'root' })
export class GoogleOAuthService {
  private readonly http = inject(HttpClient);

  /** Redirect FE enregistré dans Google Cloud (local). */
  readonly redirectUri = `${window.location.origin}/auth/callback/google`;

  getAuthorizeUrl(): Observable<AuthorizeUrlResponse> {
    return this.http
      .get<AuthorizeUrlResponse>(`${environment.apiBaseUrl}/auth/oauth/google/authorize-url`, {
        params: { redirectUri: this.redirectUri },
      })
      .pipe(tap((res) => storeOAuthState('google', res.state)));
  }

  exchangeCode(authorizationCode: string, state: string): Observable<JwtTokenResponse> {
    const body: GoogleLoginRequest = {
      authorizationCode,
      redirectUri: this.redirectUri,
      state,
    };
    return this.http.post<JwtTokenResponse>(`${environment.apiBaseUrl}/auth/oauth/google`, body);
  }
}

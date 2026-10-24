import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type {
  AuthorizeUrlResponse,
  FacebookLoginRequest,
  JwtTokenResponse,
} from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';
import { storeOAuthState } from './oauth-browser-state';

/**
 * Data-access login Facebook (SCRUM-100) — aucun secret Meta côté front.
 */
@Injectable({ providedIn: 'root' })
export class FacebookOAuthService {
  private readonly http = inject(HttpClient);

  /** Redirect FE enregistré dans Meta for Developers (local). */
  readonly redirectUri = `${window.location.origin}/auth/callback/facebook`;

  getAuthorizeUrl(): Observable<AuthorizeUrlResponse> {
    return this.http
      .get<AuthorizeUrlResponse>(`${environment.apiBaseUrl}/auth/oauth/facebook/authorize-url`, {
        params: { redirectUri: this.redirectUri },
      })
      .pipe(tap((res) => storeOAuthState('facebook', res.state)));
  }

  exchangeCode(authorizationCode: string, state: string): Observable<JwtTokenResponse> {
    const body: FacebookLoginRequest = {
      authorizationCode,
      redirectUri: this.redirectUri,
      state,
    };
    return this.http.post<JwtTokenResponse>(`${environment.apiBaseUrl}/auth/oauth/facebook`, body);
  }
}

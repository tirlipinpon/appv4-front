import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { AuthorizeUrlResponse, JwtTokenResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';
import { storeOAuthState } from './oauth-browser-state';
import type { OAuthProviderId } from './oauth-callback';

/**
 * Appels HTTP communs à Google et Facebook.
 * L'URL, le redirect et les messages restent ceux du fournisseur.
 */
@Injectable({ providedIn: 'root' })
export class OAuthHttp {
  private readonly http = inject(HttpClient);

  authorize(provider: OAuthProviderId, redirectUri: string): Observable<AuthorizeUrlResponse> {
    return this.http
      .get<AuthorizeUrlResponse>(`${environment.apiBaseUrl}/auth/oauth/${provider}/authorize-url`, {
        params: { redirectUri },
      })
      .pipe(tap((res) => storeOAuthState(provider, res.state)));
  }

  exchange(
    provider: OAuthProviderId,
    redirectUri: string,
    authorizationCode: string,
    state: string,
  ): Observable<JwtTokenResponse> {
    return this.http.post<JwtTokenResponse>(`${environment.apiBaseUrl}/auth/oauth/${provider}`, {
      authorizationCode,
      redirectUri,
      state,
    });
  }
}

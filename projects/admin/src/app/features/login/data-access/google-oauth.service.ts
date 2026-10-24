import { Injectable, inject } from '@angular/core';

import { OAuthHttp } from './oauth-http';

/**
 * Data-access login Google (SCRUM-97) — aucun secret Google côté front.
 * L'échange HTTP est celui de {@link OAuthHttp}.
 */
@Injectable({ providedIn: 'root' })
export class GoogleOAuthService {
  private readonly oauth = inject(OAuthHttp);

  /** Redirect FE enregistré dans Google Cloud (local). */
  readonly redirectUri = `${window.location.origin}/auth/callback/google`;

  getAuthorizeUrl() {
    return this.oauth.authorize('google', this.redirectUri);
  }

  exchangeCode(authorizationCode: string, state: string) {
    return this.oauth.exchange('google', this.redirectUri, authorizationCode, state);
  }
}

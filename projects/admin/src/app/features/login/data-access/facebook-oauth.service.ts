import { Injectable, inject } from '@angular/core';

import { OAuthHttp } from './oauth-http';

/**
 * Data-access login Facebook (SCRUM-100) — aucun secret Meta côté front.
 * L'échange HTTP est celui de {@link OAuthHttp}.
 */
@Injectable({ providedIn: 'root' })
export class FacebookOAuthService {
  private readonly oauth = inject(OAuthHttp);

  /** Redirect FE enregistré dans Meta for Developers (local). */
  readonly redirectUri = `${window.location.origin}/auth/callback/facebook`;

  getAuthorizeUrl() {
    return this.oauth.authorize('facebook', this.redirectUri);
  }

  exchangeCode(authorizationCode: string, state: string) {
    return this.oauth.exchange('facebook', this.redirectUri, authorizationCode, state);
  }
}

import { Injectable, inject } from '@angular/core';

import { OAuthHttp } from './oauth-http';

/**
 * Data-access Apple — même échange que Google et Facebook.
 * Le retour navigateur reste la route de callback, pas cette page.
 */
@Injectable({ providedIn: 'root' })
export class AppleOAuthService {
  private readonly oauth = inject(OAuthHttp);

  readonly redirectUri = `${window.location.origin}/auth/callback/apple`;

  getAuthorizeUrl() {
    return this.oauth.authorize('apple', this.redirectUri);
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../../core/auth/auth.service';
import { landingPath } from '../../../core/auth/space-landing';
import { connectOAuthCallback, type OAuthCallbackCopy } from '../data-access/oauth-callback';
import { FacebookOAuthService } from '../data-access/facebook-oauth.service';

const FACEBOOK: OAuthCallbackCopy = {
  id: 'facebook',
  cancelled: 'Connexion Facebook annulée ou refusée.',
  invalidState: 'Session Facebook invalide ou expirée. Réessaie.',
  exchangeFailed: 'Échec de la connexion Facebook. Réessaie.',
};

/**
 * Callback OAuth Facebook — reçoit ?code=&state=, vérifie le state navigateur, échange JWT.
 */
@Component({
  selector: 'app-facebook-callback-page',
  imports: [MatToolbarModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './facebook-callback.page.html',
  styleUrl: './facebook-callback.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacebookCallbackPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facebookOAuth = inject(FacebookOAuthService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly message = signal('Connexion Facebook…');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const pending = connectOAuthCallback({
      copy: FACEBOOK,
      query: {
        error: params.get('error'),
        code: params.get('code'),
        state: params.get('state'),
      },
      exchange: (code, state) => this.facebookOAuth.exchangeCode(code, state),
      onLoginError: (error) => {
        void this.router.navigate(['/login'], { queryParams: { error } });
      },
      onSuccess: (token) => {
        this.auth.setToken(token);
        void this.router.navigateByUrl(landingPath(this.auth.session()));
      },
      onExchangeError: (error) => {
        void this.router.navigate(['/login'], { queryParams: { error } });
      },
    });
    pending?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../../core/auth/auth.service';
import { landingPath } from '../../../core/auth/space-landing';
import { connectOAuthCallback, type OAuthCallbackCopy } from '../data-access/oauth-callback';
import { GoogleOAuthService } from '../data-access/google-oauth.service';

const GOOGLE: OAuthCallbackCopy = {
  id: 'google',
  cancelled: 'Connexion Google annulée ou refusée.',
  invalidState: 'Session Google invalide ou expirée. Réessaie.',
  exchangeFailed: 'Échec de la connexion Google. Réessaie.',
};

/**
 * Callback OAuth Google — reçoit ?code=&state=, vérifie le state navigateur, échange JWT.
 */
@Component({
  selector: 'app-google-callback-page',
  imports: [MatToolbarModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './google-callback.page.html',
  styleUrl: './google-callback.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCallbackPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly googleOAuth = inject(GoogleOAuthService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly message = signal('Connexion Google…');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const pending = connectOAuthCallback({
      copy: GOOGLE,
      query: {
        error: params.get('error'),
        code: params.get('code'),
        state: params.get('state'),
      },
      exchange: (code, state) => this.googleOAuth.exchangeCode(code, state),
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

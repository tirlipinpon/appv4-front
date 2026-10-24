import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../../core/auth/auth.service';
import { landingPath } from '../../../core/auth/space-landing';
import { takeOAuthState } from '../data-access/oauth-browser-state';
import { FacebookOAuthService } from '../data-access/facebook-oauth.service';

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

  readonly message = signal('Connexion Facebook…');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const oauthError = params.get('error');
    if (oauthError) {
      void this.router.navigate(['/login'], {
        queryParams: { error: 'Connexion Facebook annulée ou refusée.' },
      });
      return;
    }

    const code = params.get('code');
    const state = takeOAuthState('facebook', params.get('state'));
    if (!code || !state) {
      void this.router.navigate(['/login'], {
        queryParams: { error: 'Session Facebook invalide ou expirée. Réessaie.' },
      });
      return;
    }

    this.facebookOAuth.exchangeCode(code, state).subscribe({
      next: (res) => {
        this.auth.setToken(res.token);
        void this.router.navigateByUrl(landingPath(this.auth.session()));
      },
      error: () => {
        void this.router.navigate(['/login'], {
          queryParams: { error: 'Échec de la connexion Facebook. Réessaie.' },
        });
      },
    });
  }
}

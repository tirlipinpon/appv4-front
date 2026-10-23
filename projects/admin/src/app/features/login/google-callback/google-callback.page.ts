import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../../core/auth/auth.service';
import { landingPath } from '../../../core/auth/space-landing';
import { GoogleOAuthService } from '../data-access/google-oauth.service';

/**
 * Callback OAuth Google — reçoit ?code=…, échange contre JWT via le back, stocke la session.
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

  readonly message = signal('Connexion Google…');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const oauthError = params.get('error');
    if (oauthError) {
      void this.router.navigate(['/login'], {
        queryParams: { error: 'Connexion Google annulée ou refusée.' },
      });
      return;
    }

    const code = params.get('code');
    if (!code) {
      void this.router.navigate(['/login'], {
        queryParams: { error: 'Code Google manquant.' },
      });
      return;
    }

    this.googleOAuth.exchangeCode(code).subscribe({
      next: (res) => {
        this.auth.setToken(res.token);
        void this.router.navigateByUrl(landingPath(this.auth.session()));
      },
      error: () => {
        void this.router.navigate(['/login'], {
          queryParams: { error: 'Échec de la connexion Google. Réessaie.' },
        });
      },
    });
  }
}

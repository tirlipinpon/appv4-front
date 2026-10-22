import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { FacebookOAuthService } from './data-access/facebook-oauth.service';
import { GoogleOAuthService } from './data-access/google-oauth.service';

/**
 * Feature login — Google (SCRUM-97) + Facebook (SCRUM-100) + collage JWT temporaire (smoke).
 */
@Component({
  selector: 'app-login-page',
  imports: [
    FormsModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly googleOAuth = inject(GoogleOAuthService);
  private readonly facebookOAuth = inject(FacebookOAuthService);

  tokenInput = '';
  readonly error = signal<string | null>(null);
  readonly googleLoading = signal(false);
  readonly facebookLoading = signal(false);

  ngOnInit(): void {
    const fromQuery = this.route.snapshot.queryParamMap.get('error');
    if (fromQuery) {
      this.error.set(fromQuery);
    }
  }

  continueWithGoogle(): void {
    this.error.set(null);
    this.googleLoading.set(true);
    this.googleOAuth.getAuthorizeUrl().subscribe({
      next: (res) => {
        window.location.href = res.authorizationUrl;
      },
      error: () => {
        this.googleLoading.set(false);
        this.error.set(
          'Impossible de démarrer Google. Vérifie que le back tourne et GOOGLE_CLIENT_ID/SECRET.',
        );
      },
    });
  }

  continueWithFacebook(): void {
    this.error.set(null);
    this.facebookLoading.set(true);
    this.facebookOAuth.getAuthorizeUrl().subscribe({
      next: (res) => {
        window.location.href = res.authorizationUrl;
      },
      error: () => {
        this.facebookLoading.set(false);
        this.error.set(
          'Impossible de démarrer Facebook. Vérifie que le back tourne et FACEBOOK_APP_ID/SECRET.',
        );
      },
    });
  }

  submitToken(): void {
    const token = this.tokenInput.trim();
    if (!token) {
      this.error.set('Colle un JWT valide (émis par le back) pour le smoke auth.');
      return;
    }
    this.auth.setToken(token);
    this.error.set(null);
    void this.router.navigateByUrl('/');
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { landingPath } from '../../core/auth/space-landing';
import { EMAIL_FORMAT_MESSAGE, isPlausibleEmail } from '../../shared/email-format/email-format';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { FacebookOAuthService } from './data-access/facebook-oauth.service';
import { GoogleOAuthService } from './data-access/google-oauth.service';
import { LoginService } from './data-access/login.service';

/** Préremplissage local uniquement — le build prod laisse les champs vides. */
const DEV_LOGIN_EMAIL = 'test1@test.com';
const DEV_LOGIN_PASSWORD = 'Secret1!';

/**
 * Feature login — email/mdp (SCRUM-118) + Google / Facebook OAuth.
 */
@Component({
  selector: 'app-login-page',
  imports: [
    FormsModule,
    RouterLink,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
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
  private readonly loginApi = inject(LoginService);
  private readonly googleOAuth = inject(GoogleOAuthService);
  private readonly facebookOAuth = inject(FacebookOAuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly email = signal(environment.production ? '' : DEV_LOGIN_EMAIL);
  readonly password = signal(environment.production ? '' : DEV_LOGIN_PASSWORD);
  readonly showPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly googleLoading = signal(false);
  readonly facebookLoading = signal(false);

  /** Email, Google ou Facebook : une seule action à la fois. */
  readonly busy = computed(() => this.loading() || this.googleLoading() || this.facebookLoading());
  readonly canSubmit = computed(() => {
    const passwordOk = this.password().length > 0;
    return isPlausibleEmail(this.email()) && passwordOk && !this.busy();
  });
  readonly emailFormatError = computed(() => {
    const value = this.email().trim();
    if (!value || isPlausibleEmail(value)) {
      return null;
    }
    return EMAIL_FORMAT_MESSAGE;
  });

  ngOnInit(): void {
    const fromQuery = this.route.snapshot.queryParamMap.get('error');
    if (fromQuery) {
      this.error.set(fromQuery);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  submit(): void {
    if (this.busy() || !isPlausibleEmail(this.email()) || this.password().length === 0) {
      return;
    }
    this.error.set(null);
    this.loading.set(true);

    this.loginApi
      .login(this.email().trim(), this.password())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.auth.setToken(res.token);
          this.loading.set(false);
          void this.router.navigateByUrl(landingPath(this.auth.session()));
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(this.extractMessage(err));
        },
      });
  }

  continueWithGoogle(): void {
    if (this.busy()) {
      return;
    }
    this.error.set(null);
    this.googleLoading.set(true);
    this.googleOAuth
      .getAuthorizeUrl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
    if (this.busy()) {
      return;
    }
    this.error.set(null);
    this.facebookLoading.set(true);
    this.facebookOAuth
      .getAuthorizeUrl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

  private extractMessage(err: HttpErrorResponse): string {
    const fallback =
      err.status === 0
        ? 'Impossible de joindre le serveur. Vérifie que le back tourne.'
        : 'Connexion impossible.';
    return httpErrorMessage(err, fallback);
  }
}

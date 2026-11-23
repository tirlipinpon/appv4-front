import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { EMAIL_FORMAT_MESSAGE, isPlausibleEmail } from '../../shared/email-format/email-format';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { AppleOAuthService } from '../login/data-access/apple-oauth.service';
import { FacebookOAuthService } from '../login/data-access/facebook-oauth.service';
import { GoogleOAuthService } from '../login/data-access/google-oauth.service';
import { AccountRecoveryService } from './data-access/account-recovery.service';

/**
 * Récupération de l'identifiant.
 * Les boutons sociaux réutilisent le login. Le formulaire affiche la réponse API.
 */
@Component({
  selector: 'app-account-recovery-page',
  imports: [
    FormsModule,
    RouterLink,
    MatToolbarModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './account-recovery.page.html',
  styleUrl: './account-recovery.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRecoveryPage {
  private readonly api = inject(AccountRecoveryService);
  private readonly googleOAuth = inject(GoogleOAuthService);
  private readonly facebookOAuth = inject(FacebookOAuthService);
  private readonly appleOAuth = inject(AppleOAuthService);

  readonly displayName = signal('');
  readonly phone = signal('');
  readonly contactEmail = signal('');
  readonly maskedEmail = signal<string | null>(null);
  readonly resultMessage = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly socialLoading = signal(false);

  readonly canSubmit = computed(
    () =>
      this.displayName().trim().length > 0 &&
      this.phone().trim().length > 0 &&
      isPlausibleEmail(this.contactEmail()) &&
      !this.busy(),
  );

  readonly contactEmailFormatError = computed(() => {
    const value = this.contactEmail().trim();
    if (!value || isPlausibleEmail(value)) {
      return null;
    }
    return EMAIL_FORMAT_MESSAGE;
  });

  busy(): boolean {
    return this.loading() || this.socialLoading();
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.error.set(null);
    this.maskedEmail.set(null);
    this.resultMessage.set(null);
    this.loading.set(true);
    this.api
      .recover({
        displayName: this.displayName().trim(),
        phone: this.phone().trim(),
        contactEmail: this.contactEmail().trim(),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.maskedEmail.set(res.maskedEmail ?? null);
          this.resultMessage.set(res.maskedEmail ? null : (res.message ?? null));
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          const fallback =
            err.status === 0
              ? 'Impossible de joindre le serveur. Vérifie que le back tourne.'
              : 'La recherche n’a pas abouti.';
          this.error.set(httpErrorMessage(err, fallback));
        },
      });
  }

  continueWithGoogle(): void {
    this.startSocial(this.googleOAuth.getAuthorizeUrl());
  }

  continueWithFacebook(): void {
    this.startSocial(this.facebookOAuth.getAuthorizeUrl());
  }

  continueWithApple(): void {
    this.startSocial(this.appleOAuth.getAuthorizeUrl());
  }

  goTo(url: string): void {
    window.location.href = url;
  }

  private startSocial(authorize: ReturnType<GoogleOAuthService['getAuthorizeUrl']>): void {
    if (this.busy()) {
      return;
    }
    this.error.set(null);
    this.socialLoading.set(true);
    authorize.subscribe({
      next: (res) => this.goTo(res.authorizationUrl),
      error: (err: HttpErrorResponse) => {
        this.socialLoading.set(false);
        const fallback =
          err.status === 0 ? 'Impossible de joindre le serveur. Vérifie que le back tourne.' : '';
        const message = httpErrorMessage(err, fallback);
        this.error.set(message || null);
      },
    });
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { landingPath } from '../../core/auth/space-landing';
import { evaluatePasswordRules, isPasswordValid } from '../../shared/password-rules/password-rules';
import { EMAIL_FORMAT_MESSAGE, isPlausibleEmail } from '../../shared/email-format/email-format';
import { SignupService } from './data-access/signup.service';

/**
 * Feature signup — email et mot de passe (SCRUM-106).
 * Le choix de rôle est la page suivante, la même qu'après Google ou Facebook (SCRUM-155).
 */
@Component({
  selector: 'app-signup-page',
  imports: [
    FormsModule,
    RouterLink,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './signup.page.html',
  styleUrl: './signup.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupPage {
  private readonly signupApi = inject(SignupService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  displayName = '';

  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  readonly passwordRules = computed(() => evaluatePasswordRules(this.password()));
  readonly emailFormatError = computed(() => {
    const value = this.email().trim();
    if (!value || isPlausibleEmail(value)) {
      return null;
    }
    return EMAIL_FORMAT_MESSAGE;
  });
  readonly canSubmit = computed(() => {
    return isPlausibleEmail(this.email()) && isPasswordValid(this.password()) && !this.loading();
  });

  submit(): void {
    if (this.loading() || !isPlausibleEmail(this.email()) || !isPasswordValid(this.password())) {
      return;
    }
    this.error.set(null);
    this.loading.set(true);

    this.signupApi.signup(this.email().trim(), this.password(), this.displayName).subscribe({
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

  private extractMessage(err: HttpErrorResponse): string {
    const body = err.error as { message?: string } | null;
    if (body?.message && typeof body.message === 'string') {
      return body.message;
    }
    if (err.status === 0) {
      return 'Impossible de joindre le serveur. Vérifie que le back tourne.';
    }
    return 'Inscription impossible.';
  }
}

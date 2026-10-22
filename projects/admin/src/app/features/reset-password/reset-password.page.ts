import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';
import { evaluatePasswordRules, isPasswordValid } from '../../shared/password-rules/password-rules';
import { ResetPasswordService } from './data-access/reset-password.service';

/**
 * Feature reset-password — token query + checklist live (SCRUM-112).
 * Succès → clear session → /login pour se reconnecter.
 */
@Component({
  selector: 'app-reset-password-page',
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
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ResetPasswordService);
  private readonly auth = inject(AuthService);

  readonly token = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('token')?.trim() ?? '')),
    { initialValue: '' },
  );

  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly tokenMissing = computed(() => !this.token());

  readonly passwordRules = computed(() => evaluatePasswordRules(this.password()));
  readonly canSubmit = computed(() => {
    return !!this.token() && isPasswordValid(this.password()) && !this.loading();
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.error.set(null);
    this.loading.set(true);

    this.api.reset(this.token(), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.auth.clearToken();
        void this.router.navigateByUrl('/login');
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
    if (err.status === 400) {
      return 'Lien invalide ou expiré.';
    }
    return 'Impossible de mettre à jour le mot de passe.';
  }
}

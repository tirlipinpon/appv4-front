import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { ForgotPasswordService } from './data-access/forgot-password.service';

/**
 * Feature forgot-password — saisie email (SCRUM-109).
 * Succès toujours générique (email connu ou non).
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [
    FormsModule,
    RouterLink,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './forgot-password.page.html',
  styleUrl: './forgot-password.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly api = inject(ForgotPasswordService);

  readonly email = signal('');
  readonly successMessage = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  readonly canSubmit = computed(() => {
    const value = this.email().trim();
    return this.isEmailFormatValid(value) && !this.loading();
  });

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.error.set(null);
    this.successMessage.set(null);
    this.loading.set(true);

    this.api.requestReset(this.email().trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set(
          res.message ||
            'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.',
        );
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        // Validation email invalide côté API (400) — sinon message générique réseau
        if (err.status === 400) {
          this.error.set('Adresse email invalide.');
          return;
        }
        if (err.status === 0) {
          this.error.set('Impossible de joindre le serveur. Vérifie que le back tourne.');
          return;
        }
        // Anti-énumération : en cas d'erreur inattendue, ne pas révéler l'existence du compte
        this.successMessage.set(
          'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.',
        );
      },
    });
  }

  private isEmailFormatValid(email: string): boolean {
    // Validation front légère (AC format invalide) — alignée sur un email « raisonnable »
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

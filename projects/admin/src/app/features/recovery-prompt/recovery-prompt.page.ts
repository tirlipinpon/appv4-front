import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { landingPath } from '../../core/auth/space-landing';
import { EMAIL_FORMAT_MESSAGE, isPlausibleEmail } from '../../shared/email-format/email-format';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { RecoveryPromptService } from './data-access/recovery-prompt.service';

/**
 * Question posée une fois après le choix du rôle.
 * Passer ou enregistrer, puis l'espace prévu par le jeton.
 */
@Component({
  selector: 'app-recovery-prompt-page',
  imports: [
    FormsModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './recovery-prompt.page.html',
  styleUrl: './recovery-prompt.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryPromptPage implements OnInit {
  private readonly api = inject(RecoveryPromptService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly sentence = signal<string | null>(null);
  readonly displayName = signal('');
  readonly phone = signal('');
  readonly contactEmail = signal('');
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  readonly canSave = computed(() => {
    const email = this.contactEmail().trim();
    const emailOk = email.length === 0 || isPlausibleEmail(email);
    return this.displayName().trim().length > 0 && emailOk && !this.loading();
  });

  readonly contactEmailFormatError = computed(() => {
    const value = this.contactEmail().trim();
    if (!value || isPlausibleEmail(value)) {
      return null;
    }
    return EMAIL_FORMAT_MESSAGE;
  });

  ngOnInit(): void {
    this.api.load().subscribe({
      next: (body) => {
        if (body.askRecoveryContact !== true) {
          this.leave();
          return;
        }
        this.sentence.set(body.recoveryPrompt ?? null);
        this.displayName.set(body.displayName ?? '');
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, 'Impossible de joindre le serveur. Vérifie que le back tourne.'));
      },
    });
  }

  skip(): void {
    if (this.loading()) {
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.api.answer({ skip: true }).subscribe({
      next: () => this.leave(),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'La demande n’a pas abouti.'));
      },
    });
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.api
      .answer({
        skip: false,
        displayName: this.displayName().trim(),
        phone: this.phone().trim(),
        contactEmail: this.contactEmail().trim(),
      })
      .subscribe({
        next: () => this.leave(),
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(httpErrorMessage(err, 'La demande n’a pas abouti.'));
        },
      });
  }

  private leave(): void {
    void this.router.navigateByUrl(landingPath(this.auth.session()));
  }
}

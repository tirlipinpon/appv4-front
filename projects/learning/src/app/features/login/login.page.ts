import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonComponent, TextFieldComponent, ThemeToggleComponent } from '@appv4/ui';

import { ChildAuthService, apiErrorMessage } from '../../core/auth/child-auth.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-login-page',
  imports: [TextFieldComponent, ButtonComponent, ThemeToggleComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(ChildAuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly firstName = signal('');
  protected readonly pin = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected onFirstName(value: string): void {
    this.firstName.set(value);
  }

  protected onPin(value: string): void {
    this.pin.set(value.replace(/\D/g, '').slice(0, 4));
  }

  protected canSubmit(): boolean {
    return this.firstName().trim().length > 0 && this.pin().length === 4 && !this.busy();
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(this.firstName().trim(), this.pin()).subscribe({
      next: () => {
        void this.router.navigateByUrl('/home');
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        const fallback =
          err.status === 0
            ? 'Impossible de joindre le serveur. Vérifie que le back tourne.'
            : 'Connexion impossible.';
        this.error.set(apiErrorMessage(err, fallback));
      },
    });
  }
}

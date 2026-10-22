import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';

/**
 * Feature login — collage temporaire d'un JWT (login API = tickets suivants).
 * Data-access dédié arrivera avec l'endpoint login back.
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
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  tokenInput = '';
  readonly error = signal<string | null>(null);

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

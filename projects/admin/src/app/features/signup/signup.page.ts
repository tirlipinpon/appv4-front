import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { SpaceRoles, type SpaceRole } from '../../core/auth/space-roles';
import { evaluatePasswordRules, isPasswordValid } from '../../shared/password-rules/password-rules';
import { SignupService } from './data-access/signup.service';

/**
 * Feature signup — formulaire email/mdp + cases Parent / Professeur (SCRUM-106, SCRUM-122).
 * Professeur coché → /teacher-pending. Parent seul → accueil protégé.
 */
@Component({
  selector: 'app-signup-page',
  imports: [
    FormsModule,
    RouterLink,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatCheckboxModule,
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
  readonly wantParent = signal(false);
  readonly wantTeacher = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly socialCollision = signal(false);
  readonly loading = signal(false);

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  readonly passwordRules = computed(() => evaluatePasswordRules(this.password()));
  readonly canSubmit = computed(() => {
    const emailOk = this.email().trim().includes('@');
    const roleOk = this.wantParent() || this.wantTeacher();
    return emailOk && roleOk && isPasswordValid(this.password()) && !this.loading();
  });

  /** Construit le body `roles` : parent et/ou teacher, jamais admin. */
  private selectedRoles(): SpaceRole[] {
    const roles: SpaceRole[] = [];
    if (this.wantParent()) {
      roles.push(SpaceRoles.parent);
    }
    if (this.wantTeacher()) {
      roles.push(SpaceRoles.teacher);
    }
    return roles;
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.error.set(null);
    this.socialCollision.set(false);
    this.loading.set(true);

    const roles = this.selectedRoles();
    this.signupApi.signup(this.email().trim(), this.password(), roles, this.displayName).subscribe({
      next: (res) => {
        this.auth.setToken(res.token);
        this.loading.set(false);
        const target = roles.includes(SpaceRoles.teacher) ? '/teacher-pending' : '/';
        void this.router.navigateByUrl(target);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const message = this.extractMessage(err);
        this.error.set(message);
        this.socialCollision.set(this.looksLikeSocialCollision(message));
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

  private looksLikeSocialCollision(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('google') ||
      lower.includes('facebook') ||
      lower.includes('apple') ||
      lower.includes('fournisseur')
    );
  }
}

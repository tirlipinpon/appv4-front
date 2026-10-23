import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';

import { ActiveRoleService } from '../../core/auth/active-role.service';
import { AuthService } from '../../core/auth/auth.service';
import { landingPath } from '../../core/auth/space-landing';
import { SpaceRoles, spaceRoleLabel, type SpaceRole } from '../../core/auth/space-roles';

/**
 * Choix d'espace quand le jeton n'en a pas encore (SCRUM-128).
 * Pas de tableau de bord : les titres sont SCRUM-131.
 */
@Component({
  selector: 'app-select-role-page',
  imports: [MatToolbarModule, MatCardModule, MatButtonModule],
  templateUrl: './select-role.page.html',
  styleUrl: './select-role.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectRolePage {
  private readonly rolesApi = inject(ActiveRoleService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly choices: SpaceRole[] = [SpaceRoles.parent, SpaceRoles.teacher];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  buttonLabel(role: SpaceRole): string {
    const label = spaceRoleLabel(role);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  choose(role: SpaceRole): void {
    this.loading.set(true);
    this.error.set(null);
    this.rolesApi.switchTo(role).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(landingPath(this.auth.session()));
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const message = (err.error as { message?: string } | null)?.message;
        this.error.set(message || 'Choix impossible.');
      },
    });
  }
}

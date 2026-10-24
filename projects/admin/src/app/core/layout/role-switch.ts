import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { ActiveRoleService } from '../auth/active-role.service';
import { AuthService } from '../auth/auth.service';
import { landingPath } from '../auth/space-landing';
import { otherSpaceRole, spaceRoleLabel, type SpaceRole } from '../auth/space-roles';

/**
 * Bouton d'en-tête pour changer d'espace sans se déconnecter (SCRUM-125).
 * Absent quand le jeton ne contient qu'un seul rôle.
 */
@Component({
  selector: 'app-role-switch',
  imports: [MatButtonModule],
  templateUrl: './role-switch.html',
  styleUrl: './role-switch.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleSwitch {
  private readonly auth = inject(AuthService);
  private readonly roles = inject(ActiveRoleService);
  private readonly router = inject(Router);

  readonly session = this.auth.session;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly spaceLabel = computed(() => this.label(this.session().activeRole));

  /** L'autre espace, seulement si le jeton en liste deux. */
  readonly otherRole = computed((): SpaceRole | null => {
    const { activeRole, roles } = this.session();
    if (!activeRole || roles.length < 2) {
      return null;
    }
    return otherSpaceRole(activeRole);
  });

  switchTo(role: SpaceRole): void {
    this.loading.set(true);
    this.error.set(null);
    this.roles.switchTo(role).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(landingPath(this.auth.session()));
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const message = (err.error as { message?: string } | null)?.message;
        this.error.set(message || 'Changement d’espace impossible.');
      },
    });
  }

  label(role: SpaceRole | null): string {
    return spaceRoleLabel(role);
  }
}

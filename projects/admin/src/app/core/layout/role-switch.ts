import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { ActiveRoleService } from '../auth/active-role.service';
import { otherSpaceRole, spaceRoleLabel, type SpaceRole } from '../auth/space-roles';
import { AuthService } from '../auth/auth.service';

/**
 * Bouton d'en-tête pour changer d'espace sans se déconnecter (SCRUM-125).
 * Absent quand le jeton ne contient qu'un seul rôle.
 */
@Component({
  selector: 'app-role-switch',
  imports: [MatButtonModule],
  template: `
    @if (session().activeRole) {
      <span class="space">Espace {{ spaceLabel() }}</span>
    }
    @if (otherRole(); as target) {
      <button mat-button type="button" [disabled]="loading()" (click)="switchTo(target)">
        Passer en {{ label(target) }}
      </button>
    }
    @if (error()) {
      <span class="switch-error" role="alert">{{ error() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .space {
      font-size: 0.95rem;
    }
    .switch-error {
      font-size: 0.85rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleSwitch {
  private readonly auth = inject(AuthService);
  private readonly roles = inject(ActiveRoleService);

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
      next: () => this.loading.set(false),
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

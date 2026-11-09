import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { ActiveRoleService } from '../auth/active-role.service';
import { AuthService } from '../auth/auth.service';
import { landingPath } from '../auth/space-landing';
import { SpaceRoles, type SpaceRole } from '../auth/space-roles';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';

interface SpaceTab {
  role: SpaceRole;
  label: string;
  current: boolean;
}

/**
 * Onglets Parent et Professeur (SCRUM-166).
 * Un onglet n'existe que si le jeton a déjà ce rôle. Le clic sur l'autre espace réutilise le changement déjà en place.
 */
@Component({
  selector: 'app-role-switch',
  templateUrl: './role-switch.html',
  styleUrl: './role-switch.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleSwitch {
  private readonly auth = inject(AuthService);
  private readonly roles = inject(ActiveRoleService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly session = this.auth.session;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Parent puis Professeur. L'onglet marqué est l'espace actif, pas l'adresse ouverte. */
  readonly tabs = computed((): SpaceTab[] => {
    const { activeRole, roles } = this.session();
    const granted = new Set(roles);
    const order: { role: SpaceRole; label: string }[] = [
      { role: SpaceRoles.parent, label: 'Parent' },
      { role: SpaceRoles.teacher, label: 'Professeur' },
    ];
    return order
      .filter((tab) => granted.has(tab.role))
      .map((tab) => ({ ...tab, current: activeRole === tab.role }));
  });

  open(role: SpaceRole): void {
    if (this.session().activeRole === role) {
      void this.router.navigateByUrl(this.home(role));
      return;
    }
    this.switchTo(role);
  }

  private switchTo(role: SpaceRole): void {
    this.loading.set(true);
    this.error.set(null);
    this.roles
      .switchTo(role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigateByUrl(landingPath(this.auth.session()));
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(httpErrorMessage(err, 'Changement d’espace impossible.'));
        },
      });
  }

  private home(role: SpaceRole): string {
    return role === SpaceRoles.parent ? '/parent' : '/teacher';
  }
}

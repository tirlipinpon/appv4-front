import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { landingPath } from '../../core/auth/space-landing';
import { SpaceRoles, type SpaceRole } from '../../core/auth/space-roles';
import { CompleteRolesService } from './data-access/complete-roles.service';

/**
 * Choix de rôle après la création du compte (SCRUM-155).
 * Email, Google et Facebook arrivent ici s'ils n'ont pas encore de rôle.
 */
@Component({
  selector: 'app-complete-roles-page',
  imports: [MatToolbarModule, MatCardModule, MatCheckboxModule, MatButtonModule],
  templateUrl: './complete-roles.page.html',
  styleUrl: './complete-roles.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompleteRolesPage {
  private readonly api = inject(CompleteRolesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly wantParent = signal(false);
  readonly wantTeacher = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly canSubmit = computed(
    () => (this.wantParent() || this.wantTeacher()) && !this.loading(),
  );

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.api.complete(this.selectedRoles()).subscribe({
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
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { RoleSwitch } from '../../core/layout/role-switch';
import { SpaceAccess } from '../../core/layout/space-access';

/**
 * Adresse de l'espace professeur (SCRUM-128).
 * Le tableau de bord titré reste SCRUM-131. Ici la page peut rester vide.
 */
@Component({
  selector: 'app-teacher-space-page',
  imports: [RouterLink, MatToolbarModule, MatButtonModule, RoleSwitch, SpaceAccess],
  templateUrl: './teacher-space.page.html',
  styleUrl: './teacher-space.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSpacePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

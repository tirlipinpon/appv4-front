import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../auth/auth.service';
import { RoleSwitch } from './role-switch';
import { SpaceAccess } from './space-access';

/**
 * En-tête des pages déjà connectées.
 * Le titre et la déconnexion sont communs. Chaque page ajoute ses liens dans le contenu projeté.
 * La modération ne montre pas le changement d'espace.
 */
@Component({
  selector: 'app-space-header',
  imports: [MatToolbarModule, MatButtonModule, RoleSwitch, SpaceAccess],
  templateUrl: './space-header.html',
  styleUrl: './space-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceHeader {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Faux sur la file de modération : pas de passage parent/professeur. */
  readonly showSpaceActions = input(true);

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

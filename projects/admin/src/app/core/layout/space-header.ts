import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../auth/auth.service';
import { SpaceRoles } from '../auth/space-roles';
import { RoleSwitch } from './role-switch';
import { SpaceAccess } from './space-access';

interface SpaceMenuItem {
  label: string;
  path: string;
}

/**
 * Bandeau des pages déjà connectées (SCRUM-166).
 * Deux étages pour le parent et le professeur : l'onglet dit l'espace, le sous-menu dit la page.
 * La file du compte admin ne montre ni ces onglets ni ce sous-menu.
 */
@Component({
  selector: 'app-space-header',
  imports: [MatToolbarModule, MatButtonModule, RouterLink, RouterLinkActive, RoleSwitch, SpaceAccess],
  templateUrl: './space-header.html',
  styleUrl: './space-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceHeader {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Faux sur la file de modération : pas d'onglets parent ou professeur. */
  readonly showSpaceActions = input(true);

  /** Pages de l'espace actif. Vide tant qu'aucun espace parent ou professeur n'est choisi. */
  readonly menu = computed((): { label: string; items: SpaceMenuItem[] } | null => {
    const role = this.auth.session().activeRole;
    if (role === SpaceRoles.parent) {
      return {
        label: 'Pages parent',
        items: [
          { label: 'Accueil', path: '/parent' },
          { label: 'Enfants', path: '/parent/enfants' },
          { label: 'Matières', path: '/parent/matieres' },
        ],
      };
    }
    if (role === SpaceRoles.teacher) {
      return {
        label: 'Pages professeur',
        items: [
          { label: 'Accueil', path: '/teacher' },
          { label: 'Profil', path: '/teacher/profil' },
          { label: 'Écoles', path: '/teacher/ecoles' },
          { label: 'Élèves', path: '/teacher/eleves' },
          { label: 'Matières', path: '/teacher/matieres' },
        ],
      };
    }
    return null;
  });

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

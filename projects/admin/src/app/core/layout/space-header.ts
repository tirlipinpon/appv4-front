import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../auth/auth.service';
import { ConnectedAccountService } from '../auth/connected-account.service';
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
 * Le titre du bandeau est le nom du compte, parent ou professeur.
 */
@Component({
  selector: 'app-space-header',
  imports: [MatToolbarModule, MatButtonModule, RouterLink, RouterLinkActive, RoleSwitch, SpaceAccess],
  templateUrl: './space-header.html',
  styleUrl: './space-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceHeader implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly account = inject(ConnectedAccountService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Nom du parent ou du professeur connecté. Vide tant que l'API n'a pas répondu. */
  readonly displayName = this.account.displayName;

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
          { label: 'Questions', path: '/teacher/questions' },
        ],
      };
    }
    return null;
  });

  ngOnInit(): void {
    this.account
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

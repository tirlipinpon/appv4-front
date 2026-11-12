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

import { knownAvatarEmoji } from '../../shared/avatars/account-avatars';
import { AuthService } from '../auth/auth.service';
import { ConnectedAccountService } from '../auth/connected-account.service';
import { SpaceRoles } from '../auth/space-roles';
import { RoleSwitch } from './role-switch';
import { SpaceAccess } from './space-access';

interface SpaceMenuItem {
  label: string;
  path: string;
  /** Repère stable pour les tests. Absent si aucun scénario ne clique ce lien. */
  testId?: string;
}

/**
 * Bandeau des pages déjà connectées (SCRUM-166).
 * Trois étages : le nom et la déconnexion, puis l'espace (parent ou professeur), puis la page.
 * La file du compte admin ne montre ni l'espace ni le sous-menu.
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
  readonly avatarFace = computed(() => knownAvatarEmoji(this.account.avatarCode()));

  /** Faux sur la file de modération : pas d'onglets parent ou professeur. */
  readonly showSpaceActions = input(true);

  /** Pages de l'espace actif. Vide tant qu'aucun espace parent ou professeur n'est choisi. */
  readonly menu = computed((): { label: string; items: SpaceMenuItem[] } | null => {
    const role = this.auth.session().activeRole;
    if (role === SpaceRoles.parent) {
      return {
        label: 'Pages parent',
        items: [
          { label: 'Accueil', path: '/parent', testId: 'parent-nav-home' },
          { label: 'Enfants', path: '/parent/enfants', testId: 'parent-nav-children' },
          { label: 'Profil', path: '/parent/profil', testId: 'parent-nav-profile' },
          { label: 'Matières', path: '/parent/matieres', testId: 'parent-nav-subjects' },
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

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
  /** Repère stable pour les parcours. Le libellé, lui, change avec la langue. */
  testId: string;
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
          { label: 'Accueil', path: '/parent', testId: 'nav-parent-home' },
          { label: 'Enfants', path: '/parent/enfants', testId: 'nav-parent-children' },
          { label: 'Profil', path: '/parent/profil', testId: 'nav-parent-profile' },
          { label: 'Matières', path: '/parent/matieres', testId: 'nav-parent-subjects' },
        ],
      };
    }
    if (role === SpaceRoles.teacher) {
      return {
        label: 'Pages professeur',
        items: [
          { label: 'Accueil', path: '/teacher', testId: 'nav-teacher-home' },
          { label: 'Profil', path: '/teacher/profil', testId: 'nav-teacher-profile' },
          { label: 'Écoles', path: '/teacher/ecoles', testId: 'nav-teacher-schools' },
          { label: 'Élèves', path: '/teacher/eleves', testId: 'nav-teacher-students' },
          { label: 'Matières', path: '/teacher/matieres', testId: 'nav-teacher-subjects' },
          { label: 'Questions', path: '/teacher/questions', testId: 'nav-teacher-questions' },
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

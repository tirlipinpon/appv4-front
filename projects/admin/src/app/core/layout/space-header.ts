import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';

import { knownAvatarEmoji } from '../../shared/avatars/account-avatars';
import { AuthService } from '../auth/auth.service';
import { ConnectedAccountService } from '../auth/connected-account.service';
import { SpaceRoles } from '../auth/space-roles';
import { RoleSwitch } from './role-switch';
import { SpaceAccess } from './space-access';
import { AdminSectionNav } from './admin-section-nav/admin-section-nav';
import { PARENT_MENU, SpaceMenuEntry, SpaceTrailNames, TEACHER_MENU, spaceTrail } from './space-trail';

/**
 * Coque des pages déjà connectées (SCRUM-166).
 * À gauche, les pages de l'espace. En haut, le nom du compte, les onglets Parent et Professeur, puis la déconnexion.
 * Un espace encore fermé (demande professeur, ouvrir parent) reste dans la barre du haut.
 * Un compte admin y voit aussi Demandes professeur, Humeurs et IA, y compris sur ces pages.
 * Le fil reprend le catalogue du menu. Il ne remplace aucune rangée.
 */
@Component({
  selector: 'app-space-header',
  imports: [MatButtonModule, RouterLink, RouterLinkActive, RoleSwitch, SpaceAccess, AdminSectionNav],
  templateUrl: './space-header.html',
  styleUrl: './space-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceHeader implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly account = inject(ConnectedAccountService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trailNames = inject(SpaceTrailNames);
  private readonly url = signal(this.router.url);

  /** Nom du parent ou du professeur connecté. Vide tant que l'API n'a pas répondu. */
  readonly displayName = this.account.displayName;
  readonly avatarFace = computed(() => knownAvatarEmoji(this.account.avatarCode()));

  /** Faux sur la file de modération : pas d'onglets parent ou professeur. */
  readonly showSpaceActions = input(true);

  /** Vrai si le jeton porte le rôle admin, en plus de l'espace parent ou professeur. */
  readonly showAdminNav = computed(() => this.showSpaceActions() && this.auth.session().admin);

  /** Pages de l'espace actif. Vide tant qu'aucun espace parent ou professeur n'est choisi. */
  readonly menu = computed((): { label: string; items: readonly SpaceMenuEntry[] } | null => {
    const role = this.auth.session().activeRole;
    if (role === SpaceRoles.parent) {
      return { label: 'Pages parent', items: PARENT_MENU };
    }
    if (role === SpaceRoles.teacher) {
      return { label: 'Pages professeur', items: TEACHER_MENU };
    }
    return null;
  });

  readonly trail = computed(() =>
    spaceTrail(this.url(), this.trailNames.studentName(), this.trailNames.subjectName()),
  );

  /** Menu latéral ouvert sur un écran étroit. Sur un grand écran il reste visible. */
  readonly navOpen = signal(false);

  toggleNav(): void {
    this.navOpen.update((open) => !open);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  ngOnInit(): void {
    this.url.set(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.url.set(event.urlAfterRedirects));
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

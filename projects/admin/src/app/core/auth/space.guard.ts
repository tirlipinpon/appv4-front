import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { landingPath } from './space-landing';
import type { SpaceRole } from './space-roles';

/**
 * Laisse passer seulement l'espace du jeton (SCRUM-128).
 * Un autre rôle, ou pas d'espace choisi, part vers la bonne adresse.
 */
export function spaceGuard(expected: SpaceRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    if (auth.session().activeRole === expected) {
      return true;
    }
    return router.createUrlTree([landingPath(auth.session())]);
  };
}

/**
 * La page de choix n'existe que si les deux rôles sont là et qu'aucun espace n'est choisi.
 */
export const selectRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  const session = auth.session();
  if (!session.activeRole && session.roles.length >= 2) {
    return true;
  }
  return router.createUrlTree([landingPath(session)]);
};

/**
 * La page de rôle n'existe que tant que le compte n'a pas encore choisi (SCRUM-155).
 */
export const completeRolesGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (landingPath(auth.session()) === '/complete-roles') {
    return true;
  }
  return router.createUrlTree([landingPath(auth.session())]);
};

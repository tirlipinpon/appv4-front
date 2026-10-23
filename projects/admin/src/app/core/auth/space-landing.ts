import type { AdminTokenSession } from './admin-token';
import { SpaceRoles } from './space-roles';

/**
 * Où envoyer quelqu'un juste après un jeton (SCRUM-128).
 * Un seul rôle, ou un souvenir : son espace. Deux rôles sans souvenir : le choix.
 */
export function landingPath(session: AdminTokenSession): string {
  if (session.activeRole === SpaceRoles.parent) {
    return '/parent';
  }
  if (session.activeRole === SpaceRoles.teacher) {
    return '/teacher';
  }
  if (session.roles.length >= 2) {
    return '/select-role';
  }
  if (session.pendingTeacher) {
    return '/teacher-pending';
  }
  if (session.roles.length === 0 && !session.activeRole) {
    return '/complete-roles';
  }
  return '/';
}

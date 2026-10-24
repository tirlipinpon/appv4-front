import { Routes } from '@angular/router';

import { spaceGuard } from '../../core/auth/space.guard';
import { SpaceRoles } from '../../core/auth/space-roles';
import { TeacherSpacePage } from './teacher-space.page';

/** Espace professeur : le jeton doit dire teacher (SCRUM-128).
 * Le formulaire de profil n'est chargé qu'à l'ouverture de /teacher/profil.
 */
export const TEACHER_ROUTES: Routes = [
  {
    path: 'profil',
    loadComponent: () => import('./teacher-profile.page').then((m) => m.TeacherProfilePage),
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
  {
    path: '',
    pathMatch: 'full',
    component: TeacherSpacePage,
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
];

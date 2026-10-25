import { Routes } from '@angular/router';

import { spaceGuard } from '../../core/auth/space.guard';
import { SpaceRoles } from '../../core/auth/space-roles';
import { TeacherSpacePage } from './teacher-space.page';

/** Espace professeur : le jeton doit dire teacher (SCRUM-128).
 * Le profil, les écoles et les matières ne se chargent qu'à l'ouverture de leur page.
 */
export const TEACHER_ROUTES: Routes = [
  {
    path: 'profil',
    loadComponent: () => import('./teacher-profile.page').then((m) => m.TeacherProfilePage),
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
  {
    path: 'ecoles',
    loadComponent: () => import('./teacher-schools.page').then((m) => m.TeacherSchoolsPage),
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
  {
    path: 'matieres',
    loadComponent: () => import('./teacher-subjects.page').then((m) => m.TeacherSubjectsPage),
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
  {
    path: '',
    pathMatch: 'full',
    component: TeacherSpacePage,
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
];

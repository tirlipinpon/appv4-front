import { Routes } from '@angular/router';

import { spaceGuard } from '../../core/auth/space.guard';
import { SpaceRoles } from '../../core/auth/space-roles';
import { TeacherProfilePage } from './teacher-profile.page';
import { TeacherSpacePage } from './teacher-space.page';

/** Espace professeur : le jeton doit dire teacher (SCRUM-128). Le profil est SCRUM-159. */
export const TEACHER_ROUTES: Routes = [
  { path: 'profil', component: TeacherProfilePage, canActivate: [spaceGuard(SpaceRoles.teacher)] },
  {
    path: '',
    pathMatch: 'full',
    component: TeacherSpacePage,
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
];

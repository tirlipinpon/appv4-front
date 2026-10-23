import { Routes } from '@angular/router';

import { spaceGuard } from '../../core/auth/space.guard';
import { SpaceRoles } from '../../core/auth/space-roles';
import { TeacherSpacePage } from './teacher-space.page';

/** Espace professeur : le jeton doit dire teacher (SCRUM-128). */
export const TEACHER_ROUTES: Routes = [
  { path: '', component: TeacherSpacePage, canActivate: [spaceGuard(SpaceRoles.teacher)] },
];

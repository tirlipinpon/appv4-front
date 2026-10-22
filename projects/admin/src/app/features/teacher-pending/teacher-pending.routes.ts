import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';
import { TeacherPendingPage } from './teacher-pending.page';

/** Cible post-inscription quand la case Professeur est cochée (SCRUM-122). */
export const TEACHER_PENDING_ROUTES: Routes = [
  { path: '', component: TeacherPendingPage, canActivate: [authGuard] },
];

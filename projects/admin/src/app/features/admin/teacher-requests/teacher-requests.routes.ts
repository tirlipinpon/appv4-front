import { Routes } from '@angular/router';

import { adminModerationGuard } from '../../../core/auth/space.guard';
import { TeacherRequestsPage } from './teacher-requests.page';

/** File de modération, réservée au rôle admin (SCRUM-143). */
export const TEACHER_REQUESTS_ROUTES: Routes = [
  { path: '', component: TeacherRequestsPage, canActivate: [adminModerationGuard] },
];

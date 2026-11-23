import { Routes } from '@angular/router';

import { completeRolesGuard } from '../../core/auth/space.guard';
import { CompleteRolesPage } from './complete-roles.page';

/** Choix de rôle après création du compte (SCRUM-155). */
export const COMPLETE_ROLES_ROUTES: Routes = [
  { path: '', component: CompleteRolesPage, canActivate: [completeRolesGuard] },
];

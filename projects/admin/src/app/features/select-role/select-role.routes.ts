import { Routes } from '@angular/router';

import { selectRoleGuard } from '../../core/auth/space.guard';
import { SelectRolePage } from './select-role.page';

/** Choix Parent / Professeur quand le jeton n'a pas d'espace (SCRUM-128). */
export const SELECT_ROLE_ROUTES: Routes = [
  { path: '', component: SelectRolePage, canActivate: [selectRoleGuard] },
];

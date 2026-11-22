import { Routes } from '@angular/router';

import { adminModerationGuard } from '../../../core/auth/space.guard';
import { HumeursPage } from './humeurs.page';

/** Bibliothèque des humeurs, réservée au rôle admin (ADMIN-68). */
export const HUMEURS_ROUTES: Routes = [
  { path: '', component: HumeursPage, canActivate: [adminModerationGuard] },
];

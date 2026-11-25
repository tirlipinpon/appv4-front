import { Routes } from '@angular/router';

import { adminModerationGuard } from '../../../core/auth/space.guard';
import { HorairesPage } from './horaires.page';

/** Heure de début et heure de fin de l'app enfant, réservées au rôle admin. */
export const HORAIRES_ROUTES: Routes = [
  { path: '', component: HorairesPage, canActivate: [adminModerationGuard] },
];

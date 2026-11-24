import { Routes } from '@angular/router';

import { adminModerationGuard } from '../../../core/auth/space.guard';
import { IaPage } from './ia.page';

/** Connexions de modèles, réservées au rôle admin (ADMIN-82). */
export const IA_ROUTES: Routes = [{ path: '', component: IaPage, canActivate: [adminModerationGuard] }];

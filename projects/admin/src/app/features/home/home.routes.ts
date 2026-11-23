import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';
import { HomePage } from './home.page';

/** Routes de la feature home (page smoke post-login). */
export const HOME_ROUTES: Routes = [
  { path: '', component: HomePage, canActivate: [authGuard] },
];

import { Routes } from '@angular/router';

/**
 * Shell routes — chaque feature expose ses propres `*.routes.ts` (lazy).
 * Auth transverse = `core/auth` (guard / interceptor / AuthService).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  { path: '**', redirectTo: '' },
];

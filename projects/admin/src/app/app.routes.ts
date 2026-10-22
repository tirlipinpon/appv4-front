import { Routes } from '@angular/router';

/**
 * Shell routes — chaque feature expose ses propres `*.routes.ts` (lazy).
 * Auth transverse = `core/auth` (guard / interceptor / AuthService).
 *
 * Callback Google : URL exacte enregistrée dans Google Cloud
 * {@code http://localhost:4201/auth/callback/google} (SCRUM-97).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: 'auth/callback/google',
    loadComponent: () =>
      import('./features/login/google-callback/google-callback.page').then((m) => m.GoogleCallbackPage),
  },
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  { path: '**', redirectTo: '' },
];

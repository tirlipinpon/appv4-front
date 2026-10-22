import { Routes } from '@angular/router';

/**
 * Shell routes — chaque feature expose ses propres `*.routes.ts` (lazy).
 * Auth transverse = `core/auth` (guard / interceptor / AuthService).
 *
 * Callbacks OAuth (URL exactes enregistrées chez le provider) :
 * {@code http://localhost:4201/auth/callback/google} (SCRUM-97)
 * {@code http://localhost:4201/auth/callback/facebook} (SCRUM-100)
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
    path: 'auth/callback/facebook',
    loadComponent: () =>
      import('./features/login/facebook-callback/facebook-callback.page').then(
        (m) => m.FacebookCallbackPage,
      ),
  },
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  { path: '**', redirectTo: '' },
];

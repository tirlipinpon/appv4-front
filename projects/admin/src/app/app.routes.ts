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
    path: 'signup',
    loadChildren: () => import('./features/signup/signup.routes').then((m) => m.SIGNUP_ROUTES),
  },
  {
    path: 'forgot-password',
    loadChildren: () =>
      import('./features/forgot-password/forgot-password.routes').then((m) => m.FORGOT_PASSWORD_ROUTES),
  },
  {
    path: 'reset-password',
    loadChildren: () =>
      import('./features/reset-password/reset-password.routes').then((m) => m.RESET_PASSWORD_ROUTES),
  },
  {
    path: 'account-recovery',
    loadChildren: () =>
      import('./features/account-recovery/account-recovery.routes').then((m) => m.ACCOUNT_RECOVERY_ROUTES),
  },
  {
    path: 'teacher-pending',
    loadChildren: () =>
      import('./features/teacher-pending/teacher-pending.routes').then((m) => m.TEACHER_PENDING_ROUTES),
  },
  {
    path: 'select-role',
    loadChildren: () =>
      import('./features/select-role/select-role.routes').then((m) => m.SELECT_ROLE_ROUTES),
  },
  {
    path: 'parent',
    loadChildren: () => import('./features/parent/parent.routes').then((m) => m.PARENT_ROUTES),
  },
  {
    path: 'teacher',
    loadChildren: () => import('./features/teacher/teacher.routes').then((m) => m.TEACHER_ROUTES),
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

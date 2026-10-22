import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { HomePage } from './features/home/home.page';
import { LoginPage } from './features/login/login.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: '', component: HomePage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];

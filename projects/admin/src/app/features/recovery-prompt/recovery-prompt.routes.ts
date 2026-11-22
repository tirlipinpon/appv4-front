import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';
import { RecoveryPromptPage } from './recovery-prompt.page';

/** Question posée une fois, après le choix du rôle. */
export const RECOVERY_PROMPT_ROUTES: Routes = [
  { path: '', component: RecoveryPromptPage, canActivate: [authGuard] },
];

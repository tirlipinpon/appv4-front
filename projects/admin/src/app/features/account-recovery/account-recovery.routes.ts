import { Routes } from '@angular/router';

import { AccountRecoveryPage } from './account-recovery.page';

/** Récupération de l'identifiant, ouverte depuis le mot de passe oublié. */
export const ACCOUNT_RECOVERY_ROUTES: Routes = [{ path: '', component: AccountRecoveryPage }];

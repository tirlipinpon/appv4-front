import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { ConnectedAccountResponse } from '../api/api-models';
import { AuthService } from './auth.service';

/**
 * Envoie vers la sollicitation avant un espace, si le compte n'a pas encore répondu.
 * « Qui es-tu ? » n'a pas ce garde : le rôle se choisit d'abord.
 * Une lecture sans le drapeau, ou en erreur, laisse passer.
 */
export const recoveryPromptGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);
  if (!auth.isAuthenticated()) {
    return true;
  }
  return http.get<ConnectedAccountResponse>(`${environment.apiBaseUrl}/auth/me`).pipe(
    map((body) =>
      body.askRecoveryContact === true ? router.createUrlTree(['/recovery-prompt']) : true,
    ),
    catchError(() => of(true)),
  );
};

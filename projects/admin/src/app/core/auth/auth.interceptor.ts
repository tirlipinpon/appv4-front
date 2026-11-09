import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Ajoute Authorization: Bearer sur les appels vers l'API admin (/api/int).
 * Un 401 du jeton courant ferme la session. Un 401 de connexion, ou d'un ancien jeton, ne la touche pas.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  const isAdminApi = req.url.startsWith(environment.apiBaseUrl);
  const sendToken = Boolean(token && auth.isAuthenticated() && isAdminApi && !isCredentialAttempt(req.url));
  const outgoing = sendToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && sendToken && token === auth.getToken()) {
        auth.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};

/** Login, inscription et OAuth : un 401 décrit l'échec, pas une session à jeter. */
function isCredentialAttempt(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/signup') ||
    url.includes('/auth/oauth/') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  );
}

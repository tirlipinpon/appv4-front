import { Observable, catchError, map, of, tap } from 'rxjs';

import { takeOAuthState } from './oauth-browser-state';

export type OAuthProviderId = 'google' | 'facebook';

/** Textes et identité d'un fournisseur. Les URLs restent dans le service HTTP. */
export interface OAuthCallbackCopy {
  id: OAuthProviderId;
  cancelled: string;
  invalidState: string;
  exchangeFailed: string;
}

export interface OAuthQuery {
  error: string | null;
  code: string | null;
  state: string | null;
}

export type OAuthCallbackStep =
  | { type: 'login'; error: string }
  | { type: 'exchange'; code: string; state: string };

/**
 * Décide du callback avant l'échange : annulation, state invalide, ou code à envoyer.
 * Le state stocké est consommé dès qu'on n'est pas sur une annulation fournisseur.
 */
export function prepareOAuthCallback(copy: OAuthCallbackCopy, query: OAuthQuery): OAuthCallbackStep {
  if (query.error) {
    return { type: 'login', error: copy.cancelled };
  }
  const state = takeOAuthState(copy.id, query.state);
  if (!query.code || !state) {
    return { type: 'login', error: copy.invalidState };
  }
  return { type: 'exchange', code: query.code, state };
}

/**
 * Enchaîne la décision et l'échange. L'appelant coupe l'abonnement s'il quitte la page.
 * `null` : déjà redirigé vers le login, rien à attendre.
 */
export function connectOAuthCallback(options: {
  copy: OAuthCallbackCopy;
  query: OAuthQuery;
  exchange: (code: string, state: string) => Observable<{ token: string }>;
  onLoginError: (message: string) => void;
  onSuccess: (token: string) => void;
  onExchangeError: (message: string) => void;
}): Observable<void> | null {
  const step = prepareOAuthCallback(options.copy, options.query);
  if (step.type === 'login') {
    options.onLoginError(step.error);
    return null;
  }
  return options.exchange(step.code, step.state).pipe(
    tap((res) => options.onSuccess(res.token)),
    catchError(() => {
      options.onExchangeError(options.copy.exchangeFailed);
      return of(undefined);
    }),
    map(() => undefined),
  );
}

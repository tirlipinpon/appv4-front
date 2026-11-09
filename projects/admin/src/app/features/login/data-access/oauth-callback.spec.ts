import { of, throwError } from 'rxjs';

import { storeOAuthState } from './oauth-browser-state';
import { connectOAuthCallback, type OAuthCallbackCopy } from './oauth-callback';

const google: OAuthCallbackCopy = {
  id: 'google',
  cancelled: 'annulé',
  invalidState: 'state invalide',
  exchangeFailed: 'échange refusé',
};

describe('connectOAuthCallback', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('renvoie vers le login sans échanger si le fournisseur a annulé', () => {
    const exchange = jasmine.createSpy('exchange');
    const onLoginError = jasmine.createSpy('onLoginError');

    const pending = connectOAuthCallback({
      copy: google,
      query: { error: 'access_denied', code: 'code', state: 'state' },
      exchange,
      onLoginError,
      onSuccess: () => undefined,
      onExchangeError: () => undefined,
    });

    expect(pending).toBeNull();
    expect(exchange).not.toHaveBeenCalled();
    expect(onLoginError).toHaveBeenCalledWith('annulé');
  });

  it('consomme un state qui ne correspond pas et n’échange pas', () => {
    storeOAuthState('google', 'attendu');
    const exchange = jasmine.createSpy('exchange');
    const onLoginError = jasmine.createSpy('onLoginError');

    connectOAuthCallback({
      copy: google,
      query: { error: null, code: 'code', state: 'autre' },
      exchange,
      onLoginError,
      onSuccess: () => undefined,
      onExchangeError: () => undefined,
    });

    expect(exchange).not.toHaveBeenCalled();
    expect(onLoginError).toHaveBeenCalledWith('state invalide');
    expect(sessionStorage.getItem('appv4.oauth.state.google')).toBeNull();
  });

  it('transmet le jeton quand l’échange réussit', () => {
    storeOAuthState('google', 'ok');
    const onSuccess = jasmine.createSpy('onSuccess');
    const onExchangeError = jasmine.createSpy('onExchangeError');

    connectOAuthCallback({
      copy: google,
      query: { error: null, code: 'le-code', state: 'ok' },
      exchange: (code, state) => {
        expect(code).toBe('le-code');
        expect(state).toBe('ok');
        return of({ token: 'jwt' });
      },
      onLoginError: () => undefined,
      onSuccess,
      onExchangeError,
    })?.subscribe();

    expect(onSuccess).toHaveBeenCalledWith('jwt');
    expect(onExchangeError).not.toHaveBeenCalled();
  });

  it('signale l’échec d’échange sans jeton', () => {
    storeOAuthState('facebook', 'ok');
    const onSuccess = jasmine.createSpy('onSuccess');
    const onExchangeError = jasmine.createSpy('onExchangeError');

    connectOAuthCallback({
      copy: { ...google, id: 'facebook' },
      query: { error: null, code: 'code', state: 'ok' },
      exchange: () => throwError(() => new Error('down')),
      onLoginError: () => undefined,
      onSuccess,
      onExchangeError,
    })?.subscribe();

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onExchangeError).toHaveBeenCalledWith('échange refusé');
  });
});

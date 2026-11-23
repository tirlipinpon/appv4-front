import { HttpErrorResponse } from '@angular/common/http';

import { httpErrorMessage } from './http-error-message';

describe('httpErrorMessage', () => {
  it('retourne le message quand c’est une chaîne', () => {
    const err = new HttpErrorResponse({ error: { message: 'Compte inconnu' }, status: 401 });
    expect(httpErrorMessage(err, 'Connexion impossible.')).toBe('Compte inconnu');
  });

  it('ignore un message qui n’est pas une chaîne et garde le repli', () => {
    const err = new HttpErrorResponse({ error: { message: 12 }, status: 400 });
    expect(httpErrorMessage(err, 'Connexion impossible.')).toBe('Connexion impossible.');
  });

  it('ignore un corps vide ou une chaîne blanche', () => {
    expect(httpErrorMessage(new HttpErrorResponse({ error: null, status: 0 }), 'réseau')).toBe('réseau');
    expect(httpErrorMessage(new HttpErrorResponse({ error: { message: '   ' }, status: 500 }), 'repli')).toBe(
      'repli',
    );
  });
});

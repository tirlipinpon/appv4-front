import { HttpErrorResponse } from '@angular/common/http';

/**
 * Lit le message d'une erreur HTTP seulement s'il est une chaîne.
 * Le texte de repli reste choisi par l'écran (réseau, métier, statut).
 */
export function httpErrorMessage(err: HttpErrorResponse, fallback: string): string {
  const body = err.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

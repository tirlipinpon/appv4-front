/**
 * Format d'email partagé par l'inscription, la connexion et le mot de passe oublié.
 * Refuse les adresses manifestement invalides (`@`, `a@`) avant l'appel API.
 */
const PLAUSIBLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_FORMAT_MESSAGE = 'Entre une adresse email valide.';

export function isPlausibleEmail(email: string): boolean {
  return PLAUSIBLE_EMAIL.test(email.trim());
}

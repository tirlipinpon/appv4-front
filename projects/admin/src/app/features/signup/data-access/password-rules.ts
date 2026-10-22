/**
 * Règles mot de passe alignées sur le back (SCRUM-105 / SCRUM-106).
 */
export interface PasswordRule {
  id: string;
  label: string;
  ok: boolean;
}

export function evaluatePasswordRules(password: string): PasswordRule[] {
  const value = password ?? '';
  return [
    { id: 'length', label: 'Au moins 8 caractères', ok: value.length >= 8 },
    { id: 'upper', label: 'Une majuscule', ok: /[A-Z]/.test(value) },
    { id: 'lower', label: 'Une minuscule', ok: /[a-z]/.test(value) },
    { id: 'digit', label: 'Un chiffre', ok: /[0-9]/.test(value) },
    { id: 'special', label: 'Un caractère spécial', ok: /[^A-Za-z0-9]/.test(value) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return evaluatePasswordRules(password).every((rule) => rule.ok);
}

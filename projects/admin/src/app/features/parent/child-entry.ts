import type { ParentSchoolOption } from '../../core/api/api-models';

/** Messages déjà renvoyés par l'API, affichés avant l'envoi (SCRUM-165). */
export const PIN_FORMAT = 'Le code PIN doit faire 4 chiffres.';
export const PIN_MISMATCH = 'Les deux codes PIN ne sont pas les mêmes.';
export const AGE_INVALID = "L'âge doit être un nombre entier entre 2 et 18.";
export const IMAGE_REQUIRED = 'Choisis une photo ou un avatar.';

/** Pause après la dernière frappe avant de proposer des écoles. */
export const SCHOOL_PAUSE_MS = 300;

const MIN_AGE = 2;
const MAX_AGE = 18;
const SCHOOL_MIN_QUERY = 2;
const SCHOOL_LIMIT = 40;

/** Garde les chiffres. `maxLength` coupe le code PIN à quatre. */
export function digitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, '');
  return maxLength === undefined ? digits : digits.slice(0, maxLength);
}

/**
 * Contrôle les deux codes avant l'enregistrement.
 * Quatre chiffres identiques, sinon le message du formulaire.
 */
export function pinError(pin: string, confirmation: string): string | null {
  if (!/^\d{4}$/.test(pin) || !/^\d{4}$/.test(confirmation)) {
    return PIN_FORMAT;
  }
  if (pin !== confirmation) {
    return PIN_MISMATCH;
  }
  return null;
}

/** Entier de 2 à 18. Un champ vide ou hors limites est refusé. */
export function ageError(age: string): string | null {
  if (!/^\d+$/.test(age)) {
    return AGE_INVALID;
  }
  const value = Number(age);
  if (!Number.isInteger(value) || value < MIN_AGE || value > MAX_AGE) {
    return AGE_INVALID;
  }
  return null;
}

/**
 * Écoles du pays dont le nom contient le texte.
 * Moins de deux caractères : rien. Quarante noms au plus, sans tenir compte des majuscules.
 */
export function suggestSchools(
  schools: readonly ParentSchoolOption[],
  country: string | null,
  query: string,
): ParentSchoolOption[] {
  const text = query.trim().toLowerCase();
  if (!country || text.length < SCHOOL_MIN_QUERY) {
    return [];
  }
  return schools
    .filter((school) => {
      if (school.country !== country || school.id == null) {
        return false;
      }
      return (school.name ?? '').toLowerCase().includes(text);
    })
    .slice(0, SCHOOL_LIMIT);
}

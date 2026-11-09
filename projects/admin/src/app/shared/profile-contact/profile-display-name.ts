/** Même plafond que le back (`DisplayNames.MAX_LENGTH`). */
export const PROFILE_NAME_MAX_LENGTH = 255;

export const PROFILE_NAME_REQUIRED = 'Le nom est obligatoire.';
export const PROFILE_NAME_TOO_LONG = 'Le nom est trop long (maximum 255).';

/** Message quand une saisie arrive pendant que la sauvegarde est en cours. */
export const PROFILE_PENDING_EDIT =
  "La version envoyée est enregistrée. La saisie faite pendant l'enregistrement n'est pas encore enregistrée.";

/**
 * Règles de nom partagées parent / professeur.
 *
 * <p><b>Business :</b> le nom affiché est obligatoire et borné comme côté serveur.
 * <p><b>Technique :</b> pure function, testable sans Angular.
 * <p><b>Métier / flow :</b> garde-fou avant PUT profil (parent ou teacher).
 */
export function profileDisplayNameProblem(name: string): string | null {
  if (!name) {
    return PROFILE_NAME_REQUIRED;
  }
  if (name.length > PROFILE_NAME_MAX_LENGTH) {
    return PROFILE_NAME_TOO_LONG;
  }
  return null;
}

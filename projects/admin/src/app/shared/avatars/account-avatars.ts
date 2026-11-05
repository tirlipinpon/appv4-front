/**
 * Catalogue local des avatars compte / enfant / élève.
 *
 * <p><b>Business :</b> six dessins connus ; le back envoie le code, le front affiche l'emoji.
 * <p><b>Technique :</b> une seule table pour parent, professeur et bandeau.
 * <p><b>Métier / flow :</b> API avatarCode → rendu ; codes inconnus : visage de secours
 * (liste) ou rien (bandeau).
 */
export const ACCOUNT_AVATARS = [
  { code: 'owl', label: 'Hibou', emoji: '🦉' },
  { code: 'fox', label: 'Renard', emoji: '🦊' },
  { code: 'bear', label: 'Ours', emoji: '🐻' },
  { code: 'cat', label: 'Chat', emoji: '🐱' },
  { code: 'panda', label: 'Panda', emoji: '🐼' },
  { code: 'frog', label: 'Grenouille', emoji: '🐸' },
] as const;

/** Alias historique des pages parent. */
export const CHILD_AVATARS = ACCOUNT_AVATARS;

export function avatarEmoji(code: string | null | undefined): string {
  return ACCOUNT_AVATARS.find((avatar) => avatar.code === code)?.emoji ?? '🙂';
}

/** Même rendu que {@link avatarEmoji} (élèves professeur). */
export function studentAvatar(code: string | null | undefined): string {
  return avatarEmoji(code);
}

/** Dessin du bandeau. Rien si le code est vide ou inconnu : pas de visage de secours. */
export function knownAvatarEmoji(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return ACCOUNT_AVATARS.find((avatar) => avatar.code === code)?.emoji ?? null;
}

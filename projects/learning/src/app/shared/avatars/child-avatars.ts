/**
 * Codes d'avatar renvoyés par l'API enfant (mêmes codes que le parent).
 * Le front n'invente pas de visage : seul un code connu est affiché.
 */
export const CHILD_AVATARS = [
  { code: 'owl', label: 'Hibou', emoji: '🦉' },
  { code: 'fox', label: 'Renard', emoji: '🦊' },
  { code: 'bear', label: 'Ours', emoji: '🐻' },
  { code: 'cat', label: 'Chat', emoji: '🐱' },
  { code: 'panda', label: 'Panda', emoji: '🐼' },
  { code: 'frog', label: 'Grenouille', emoji: '🐸' },
] as const;

/** Emoji pour un code API connu ; rien si le code est absent ou inconnu. */
export function knownChildAvatarEmoji(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return CHILD_AVATARS.find((avatar) => avatar.code === code)?.emoji ?? null;
}

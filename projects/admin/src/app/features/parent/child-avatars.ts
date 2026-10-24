/** Avatars livrés avec la page (SCRUM-156). Le deuxième sert au scénario de test. */
export const CHILD_AVATARS = [
  { code: 'owl', label: 'Hibou', emoji: '🦉' },
  { code: 'fox', label: 'Renard', emoji: '🦊' },
  { code: 'bear', label: 'Ours', emoji: '🐻' },
  { code: 'cat', label: 'Chat', emoji: '🐱' },
  { code: 'panda', label: 'Panda', emoji: '🐼' },
  { code: 'frog', label: 'Grenouille', emoji: '🐸' },
] as const;

export function avatarEmoji(code: string | null | undefined): string {
  return CHILD_AVATARS.find((avatar) => avatar.code === code)?.emoji ?? '🙂';
}

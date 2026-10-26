/** Mêmes codes que la fiche enfant. Cette page ne va pas chercher le dossier parent. */
const STUDENT_AVATARS = [
  { code: 'owl', emoji: '🦉' },
  { code: 'fox', emoji: '🦊' },
  { code: 'bear', emoji: '🐻' },
  { code: 'cat', emoji: '🐱' },
  { code: 'panda', emoji: '🐼' },
  { code: 'frog', emoji: '🐸' },
] as const;

export function studentAvatar(code: string | null | undefined): string {
  return STUDENT_AVATARS.find((avatar) => avatar.code === code)?.emoji ?? '🙂';
}

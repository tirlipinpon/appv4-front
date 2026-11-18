/**
 * Librairie d'icônes matières (LEARN-29 / BACK-15).
 * Codes = contrat API (`iconCode` / `iconChoices`). Pas d'invention hors liste.
 */
export const SUBJECT_ICONS = [
  { code: 'math', label: 'Mathématiques', emoji: '➗', tint: '#C1B4FF' },
  { code: 'alphabet', label: 'Alphabet', emoji: '🔤', tint: '#FFE5A3' },
  { code: 'animals', label: 'Animaux', emoji: '🦁', tint: '#C1F0D1' },
  { code: 'words', label: 'Mots', emoji: '📚', tint: '#FFB8C1' },
  { code: 'knowledge', label: 'Connaissances', emoji: '🌍', tint: '#BBE4FF' },
  { code: 'opposites', label: 'Contraires', emoji: '⚖️', tint: '#FFC4E1' },
  { code: 'books', label: 'Livres', emoji: '📖', tint: '#E2D4FF' },
  { code: 'globe', label: 'Monde', emoji: '🌐', tint: '#B8E0FF' },
  { code: 'music', label: 'Musique', emoji: '🎵', tint: '#FFD0E8' },
  { code: 'sport', label: 'Sport', emoji: '⚽', tint: '#D4F5C8' },
  { code: 'art', label: 'Arts', emoji: '🎨', tint: '#FFE0B8' },
  { code: 'science', label: 'Sciences', emoji: '🔬', tint: '#C8F0F0' },
] as const;

export type SubjectIconCode = (typeof SUBJECT_ICONS)[number]['code'];

const FALLBACK_TINT = '#D7D2FF';

/** Entrée connue pour un code API ; rien si absent ou inconnu. */
export function knownSubjectIcon(code: string | null | undefined) {
  if (!code) {
    return null;
  }
  return SUBJECT_ICONS.find((icon) => icon.code === code) ?? null;
}

/** Couleur de carte : tint de la librairie, ou neutre si pas d'icône. */
export function subjectCardTint(code: string | null | undefined): string {
  return knownSubjectIcon(code)?.tint ?? FALLBACK_TINT;
}

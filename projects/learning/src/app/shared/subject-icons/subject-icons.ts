/**
 * Affichage des icônes matières Learn (legacy emoji ou Iconify `prefix:name`).
 */

const ICONIFY_SVG = 'https://api.iconify.design';
const FALLBACK_TINT = '#D7D2FF';

const LEGACY: Readonly<Record<string, { emoji: string; tint: string }>> = {
  math: { emoji: '➗', tint: '#C1B4FF' },
  numbers: { emoji: '🔢', tint: '#D4C8FF' },
  alphabet: { emoji: '🔤', tint: '#FFE5A3' },
  reading: { emoji: '👀', tint: '#FFB8C1' },
  writing: { emoji: '✍️', tint: '#FFC4E1' },
  words: { emoji: '💬', tint: '#FFB8C1' },
  books: { emoji: '📚', tint: '#E2D4FF' },
  animals: { emoji: '🦁', tint: '#C1F0D1' },
  nature: { emoji: '🌿', tint: '#C1F0D1' },
  science: { emoji: '🔬', tint: '#C8F0F0' },
  knowledge: { emoji: '💡', tint: '#BBE4FF' },
  opposites: { emoji: '↕️', tint: '#FFC4E1' },
  globe: { emoji: '🌐', tint: '#BBE4FF' },
  music: { emoji: '🎵', tint: '#FFD0E8' },
  sport: { emoji: '⚽', tint: '#D4F5C8' },
  art: { emoji: '🎨', tint: '#FFE0B8' },
  school: { emoji: '🏫', tint: '#C1B4FF' },
  space: { emoji: '🚀', tint: '#C1B4FF' },
  puzzle: { emoji: '🧩', tint: '#FFC4E1' },
};

export function subjectIconSrc(code: string | null | undefined): string | null {
  if (!code || !code.includes(':')) {
    return null;
  }
  const sep = code.indexOf(':');
  const prefix = code.slice(0, sep);
  const name = code.slice(sep + 1);
  if (!prefix || !name) {
    return null;
  }
  return `${ICONIFY_SVG}/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`;
}

export function knownSubjectIcon(code: string | null | undefined) {
  if (!code || code.includes(':')) {
    return null;
  }
  const hit = LEGACY[code];
  return hit ? { code, ...hit } : null;
}

export function subjectCardTint(code: string | null | undefined): string {
  return knownSubjectIcon(code)?.tint ?? FALLBACK_TINT;
}

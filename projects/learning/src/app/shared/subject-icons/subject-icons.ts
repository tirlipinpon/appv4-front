/**
 * Affichage Learn : Icons8, legacy emoji, ou ancien Iconify.
 */

const ICONS8_IMG = 'https://img.icons8.com';
const ICONIFY_SVG = 'https://api.iconify.design';
const FALLBACK_TINT = '#D7D2FF';

const LEGACY: Readonly<Record<string, { emoji: string; tint: string }>> = {
  math: { emoji: '➗', tint: '#C1B4FF' },
  alphabet: { emoji: '🔤', tint: '#FFE5A3' },
  books: { emoji: '📚', tint: '#E2D4FF' },
  animals: { emoji: '🦁', tint: '#C1F0D1' },
  science: { emoji: '🔬', tint: '#C8F0F0' },
  knowledge: { emoji: '💡', tint: '#BBE4FF' },
  opposites: { emoji: '↕️', tint: '#FFC4E1' },
  globe: { emoji: '🌐', tint: '#BBE4FF' },
  music: { emoji: '🎵', tint: '#FFD0E8' },
  sport: { emoji: '⚽', tint: '#D4F5C8' },
  art: { emoji: '🎨', tint: '#FFE0B8' },
  school: { emoji: '🏫', tint: '#C1B4FF' },
};

export function subjectIconSrc(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  if (code.startsWith('icons8:')) {
    const id = code.slice('icons8:'.length).trim();
    return id ? `${ICONS8_IMG}/?id=${encodeURIComponent(id)}&format=png&size=128` : null;
  }
  if (code.includes(':')) {
    const sep = code.indexOf(':');
    const prefix = code.slice(0, sep);
    const name = code.slice(sep + 1);
    if (!prefix || !name) {
      return null;
    }
    return `${ICONIFY_SVG}/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`;
  }
  return null;
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

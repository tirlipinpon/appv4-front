/**
 * Affichage des codes matières :
 * - Icons8 `icons8:{id}` (recherche multilangue)
 * - legacy emoji court
 * - éventuels anciens codes Iconify `prefix:name`
 */

const ICONS8_IMG = 'https://img.icons8.com';
const ICONIFY_SVG = 'https://api.iconify.design';

export const SUBJECT_ICON_GLYPHS: Readonly<Record<string, string>> = {
  math: '➗',
  numbers: '🔢',
  alphabet: '🔤',
  reading: '👀',
  writing: '✍️',
  words: '💬',
  books: '📚',
  animals: '🦁',
  science: '🔬',
  knowledge: '💡',
  opposites: '↕️',
  globe: '🌐',
  music: '🎵',
  sport: '⚽',
  art: '🎨',
  school: '🏫',
};

export function isIcons8Code(code: string | null | undefined): boolean {
  return !!code && code.startsWith('icons8:');
}

/** URL image Icons8 / Iconify, ou null si emoji legacy. */
export function subjectIconSrc(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  if (code.startsWith('icons8:')) {
    const id = code.slice('icons8:'.length).trim();
    if (!id) {
      return null;
    }
    return `${ICONS8_IMG}/?id=${encodeURIComponent(id)}&format=png&size=96`;
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

export function subjectIconGlyph(code: string | null | undefined): string | null {
  if (!code || code.includes(':')) {
    return null;
  }
  return SUBJECT_ICON_GLYPHS[code] ?? null;
}

export function subjectIconLabel(code: string | null | undefined): string {
  if (!code) {
    return '';
  }
  if (code.startsWith('icons8:')) {
    return code.slice('icons8:'.length);
  }
  if (!code.includes(':')) {
    return code;
  }
  const name = code.slice(code.indexOf(':') + 1).replace(/-/g, ' ');
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
}

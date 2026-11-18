/**
 * Librairie visuelle des codes matières (BACK-15).
 * Les libellés métier viennent de `iconChoices` API ; ici seulement le glyph.
 */
export const SUBJECT_ICON_GLYPHS: Readonly<Record<string, string>> = {
  math: '➗',
  alphabet: '🔤',
  animals: '🦁',
  words: '📚',
  knowledge: '🌍',
  opposites: '⚖️',
  books: '📖',
  globe: '🌐',
  music: '🎵',
  sport: '⚽',
  art: '🎨',
  science: '🔬',
};

export function subjectIconGlyph(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return SUBJECT_ICON_GLYPHS[code] ?? null;
}

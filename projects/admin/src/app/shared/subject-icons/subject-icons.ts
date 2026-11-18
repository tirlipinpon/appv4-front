/**
 * Affichage des codes matières : legacy emoji ou Iconify `prefix:name`.
 * Les libellés / la recherche viennent de l'API Iconify ; le back valide le format.
 */

const ICONIFY_SVG = 'https://api.iconify.design';

/** Anciens codes encore éventuellement en base. */
export const SUBJECT_ICON_GLYPHS: Readonly<Record<string, string>> = {
  math: '➗',
  numbers: '🔢',
  counting: '☝️',
  geometry: '📐',
  shapes: '⬛',
  fractions: '½',
  algebra: '𝑥',
  calculator: '🧮',
  clock: '🕐',
  measure: '📏',
  money: '💶',
  alphabet: '🔤',
  letters: 'Abc',
  reading: '👀',
  writing: '✍️',
  words: '💬',
  vocabulary: '📝',
  grammar: '📖',
  spelling: '✏️',
  poetry: '🪶',
  story: '📕',
  books: '📚',
  library: '🏛️',
  language: '🗣️',
  english: '🇬🇧',
  dutch: '🇳🇱',
  spanish: '🇪🇸',
  german: '🇩🇪',
  science: '🔬',
  nature: '🌿',
  plants: '🌱',
  animals: '🦁',
  insects: '🐛',
  ocean: '🌊',
  space: '🚀',
  weather: '⛅',
  earth: '🌎',
  globe: '🌐',
  map: '🗺️',
  history: '🏺',
  geography: '🧭',
  civics: '⚖️',
  knowledge: '💡',
  discovery: '🔍',
  experiment: '🧪',
  lab: '🥼',
  music: '🎵',
  singing: '🎤',
  instrument: '🎻',
  art: '🎨',
  drawing: '🖌️',
  painting: '🖼️',
  craft: '✂️',
  colors: '🌈',
  sport: '⚽',
  football: '🏈',
  basketball: '🏀',
  swim: '🏊',
  dance: '💃',
  yoga: '🧘',
  run: '🏃',
  bike: '🚲',
  body: '🧍',
  health: '❤️',
  food: '🍽️',
  fruit: '🍎',
  vegetables: '🥕',
  kitchen: '👨‍🍳',
  home: '🏠',
  family: '👨‍👩‍👧',
  friends: '🤝',
  emotions: '😊',
  opposites: '↕️',
  seasons: '🍂',
  calendar: '📅',
  school: '🏫',
  pencil: '✏️',
  backpack: '🎒',
  computer: '💻',
  tablet: '📱',
  robot: '🤖',
  code: '💻',
  puzzle: '🧩',
  memory: '🧠',
  logic: '♟️',
  chess: '♛',
  games: '🎮',
  trophy: '🏆',
  star: '⭐',
  heart: '💖',
  flag: '🚩',
  transport: '🚌',
  car: '🚗',
  train: '🚆',
  plane: '✈️',
  boat: '⛵',
  city: '🏙️',
  farm: '🐄',
  forest: '🌲',
  mountain: '⛰️',
  beach: '🏖️',
  fire: '🔥',
  water: '💧',
  air: '💨',
  recycle: '♻️',
  light: '💡',
  sound: '🔊',
  touch: '✋',
  sight: '👁️',
  smell: '👃',
  taste: '👅',
};

export function isIconifyCode(code: string | null | undefined): boolean {
  return !!code && code.includes(':');
}

/** URL SVG Iconify, ou null si ce n'est pas un code Iconify. */
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

/** Emoji legacy, ou null (utiliser {@link subjectIconSrc} pour Iconify). */
export function subjectIconGlyph(code: string | null | undefined): string | null {
  if (!code || code.includes(':')) {
    return null;
  }
  return SUBJECT_ICON_GLYPHS[code] ?? null;
}

/** Libellé court à partir du code Iconify (ex. open-book → Open book). */
export function subjectIconLabel(code: string | null | undefined): string {
  if (!code) {
    return '';
  }
  if (!code.includes(':')) {
    return code;
  }
  const name = code.slice(code.indexOf(':') + 1).replace(/-/g, ' ');
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
}

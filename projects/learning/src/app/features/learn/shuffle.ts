/**
 * Mélange une copie du tableau (Fisher–Yates).
 * Présentation seulement : les ids métier restent ceux de l'API.
 */
export function shuffleCopy<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

/** Ordre aléatoire des boutons Vrai / Faux pour éviter le clic en réflexe. */
export function randomTrueFalseOrder(): readonly boolean[] {
  return Math.random() < 0.5 ? [true, false] : [false, true];
}

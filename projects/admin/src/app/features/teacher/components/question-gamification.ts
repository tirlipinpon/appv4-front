import type {
  CreateTeacherSubjectQuestionRequest,
  TeacherQuestionDifficultyItem,
  TeacherQuestionGamificationItem,
} from '../../../core/api/api-models';

/**
 * Réglage affiché dans le panneau Gamification.
 * `points` reprend le barème ou la saisie. Une case vide est `null` :
 * on ne la remplace pas par un nombre inventé.
 */
export interface GamificationDraft {
  maxAttempts: number;
  difficulty: string;
  difficultyLabel: string;
  customizePoints: boolean;
  gamificationDisabled: boolean;
  points: (number | null)[];
}

/** Une ligne du barème, seulement si le code, le libellé et les points sont là. */
export interface GamificationLevel {
  code: string;
  label: string;
  pointsByAttempt: number[];
}

export function copyDraft(draft: GamificationDraft): GamificationDraft {
  return { ...draft, points: [...draft.points] };
}

/** Ignore une difficulté dont le back n'a pas envoyé le code, le libellé ou les points. */
export function levelsFromCatalog(rows: TeacherQuestionDifficultyItem[] | undefined): GamificationLevel[] {
  const levels: GamificationLevel[] = [];
  for (const row of rows ?? []) {
    const points = row.pointsByAttempt;
    if (!row.code || !row.label || !points?.length || points.some((point) => !Number.isInteger(point))) {
      continue;
    }
    levels.push({ code: row.code, label: row.label, pointsByAttempt: [...points] });
  }
  return levels;
}

/** Reprend l'item API tel quel. Incomplet : rien, pour ne pas afficher un barème inventé. */
export function draftFromItem(item: TeacherQuestionGamificationItem | null | undefined): GamificationDraft | null {
  const attempts = item?.maxAttempts;
  const points = item?.points;
  if (
    item == null ||
    attempts == null ||
    !Number.isInteger(attempts) ||
    attempts < 1 ||
    !item.difficulty ||
    !item.difficultyLabel ||
    item.customizePoints == null ||
    item.gamificationDisabled == null ||
    points == null ||
    points.length !== attempts ||
    points.some((point) => !Number.isInteger(point))
  ) {
    return null;
  }
  return {
    maxAttempts: attempts,
    difficulty: item.difficulty,
    difficultyLabel: item.difficultyLabel,
    customizePoints: item.customizePoints,
    gamificationDisabled: item.gamificationDisabled,
    points: [...points],
  };
}

function levelOf(levels: GamificationLevel[], code: string): GamificationLevel | undefined {
  return levels.find((level) => level.code === code);
}

/** Plafond d'essais : la longueur du barème de cette difficulté. */
export function attemptLimit(levels: GamificationLevel[], difficulty: string): number | null {
  const length = levelOf(levels, difficulty)?.pointsByAttempt.length ?? 0;
  return length > 0 ? length : null;
}

export function withAttempts(
  draft: GamificationDraft,
  attempts: number,
  levels: GamificationLevel[],
): GamificationDraft {
  const limit = attemptLimit(levels, draft.difficulty);
  if (limit == null) {
    return draft;
  }
  const next = Math.min(Math.max(1, attempts), limit);
  const scale = levelOf(levels, draft.difficulty)?.pointsByAttempt ?? [];
  if (draft.customizePoints) {
    return { ...draft, maxAttempts: next, points: extendPoints(draft.points, next, scale) };
  }
  return { ...draft, maxAttempts: next, points: scale.slice(0, next) };
}

/** Les essais déjà saisis restent. Chaque essai ajouté reprend le point du barème, à cet index. */
function extendPoints(current: (number | null)[], next: number, scale: number[]): (number | null)[] {
  const points = current.slice(0, next);
  while (points.length < next) {
    const fromScale = scale[points.length];
    points.push(Number.isInteger(fromScale) ? fromScale : null);
  }
  return points;
}

export function withDifficulty(draft: GamificationDraft, level: GamificationLevel): GamificationDraft {
  return {
    ...draft,
    difficulty: level.code,
    difficultyLabel: level.label,
    points: level.pointsByAttempt.slice(0, draft.maxAttempts),
  };
}

export function withCustomize(
  draft: GamificationDraft,
  enabled: boolean,
  levels: GamificationLevel[],
): GamificationDraft {
  if (enabled) {
    return { ...draft, customizePoints: true };
  }
  const scale = levelOf(levels, draft.difficulty)?.pointsByAttempt.slice(0, draft.maxAttempts);
  if (!scale) {
    return { ...draft, customizePoints: false };
  }
  return { ...draft, customizePoints: false, points: scale };
}

export function withPoint(draft: GamificationDraft, index: number, raw: string): GamificationDraft {
  const points = [...draft.points];
  const trimmed = raw.trim();
  if (trimmed === '') {
    points[index] = null;
  } else {
    const parsed = Number(trimmed);
    points[index] = Number.isInteger(parsed) ? parsed : null;
  }
  return { ...draft, points };
}

export function withDisabled(draft: GamificationDraft, disabled: boolean): GamificationDraft {
  return { ...draft, gamificationDisabled: disabled };
}

/** Corps envoyé au back. Les points ne partent que si le professeur les personnalise. */
export function gamificationInput(
  draft: GamificationDraft | null | undefined,
): CreateTeacherSubjectQuestionRequest['gamification'] {
  if (!draft) {
    return undefined;
  }
  const points = draft.points.filter((point): point is number => point != null);
  return {
    maxAttempts: draft.maxAttempts,
    difficulty: draft.difficulty,
    customizePoints: draft.customizePoints,
    gamificationDisabled: draft.gamificationDisabled,
    ...(draft.customizePoints ? { points } : {}),
  };
}

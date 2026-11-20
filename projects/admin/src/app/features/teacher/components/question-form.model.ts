import { ClickZone } from './click-zone';
import { GamificationDraft } from './question-gamification';
import { MAGNET_DEFAULT } from './puzzle-piece';

/**
 * Codes de forme gérés par l'éditeur professeur.
 *
 * <p><b>Business :</b> chaque code correspond à un type de question que le prof
 * peut préparer ; le libellé affiché vient de l'API.
 * <p><b>Technique :</b> union littérale pour typer les branches draft → requête.
 * <p><b>Métier / flow :</b> liste des formes API → sélection → adaptateur de save.
 */
export const FORM = {
  QCM: 'qcm',
  MEMORY: 'memory',
  ORDER: 'order',
  TRUE_FALSE: 'vrai_faux',
  LINKS: 'liens',
  CASE_VIDE: 'case_vide',
  CLASSIFICATION: 'classement',
  TEXTE: 'texte',
  REPONSE_LIBRE: 'reponse_libre',
  IMAGE_CLICK: 'image_interactive',
  PUZZLE: 'puzzle',
  SIMON: 'simon',
} as const;

export type KnownFormCode = (typeof FORM)[keyof typeof FORM];

export const HOLE = '___';

export interface ChoiceDraft {
  label: string;
  correct: boolean;
  imageDataUrl?: string;
  /** Vrai quand la liste sait qu'une image existe, sans en envoyer les octets. */
  hasImage?: boolean;
}

export interface SavedChoice {
  label: string;
  correct: boolean;
  imageDataUrl?: string;
  hasImage?: boolean;
}

export interface PairDraft {
  questionSide: string;
  answerSide: string;
  questionImageDataUrl?: string;
  answerImageDataUrl?: string;
  questionHasImage?: boolean;
  answerHasImage?: boolean;
}

export interface ItemDraft {
  label: string;
  /** Jalon de frise (ex. « 20 minutes »). Vide si timeline désactivée. */
  axisLabel: string;
  imageDataUrl?: string;
  hasImage?: boolean;
}

export interface StatementDraft {
  label: string;
  truthful: boolean | null;
  imageDataUrl?: string;
  hasImage?: boolean;
}

export interface LinkDraft {
  leftLabel: string;
  rightLabel: string;
  leftImageDataUrl?: string;
  rightImageDataUrl?: string;
  leftHasImage?: boolean;
  rightHasImage?: boolean;
}

export interface ColumnDraft {
  label: string;
}

/** Carte rattachée à une colonne via l'index 0-based dans `columns`. */
export interface CardDraft {
  label: string;
  columnIndex: number;
  imageDataUrl?: string;
  hasImage?: boolean;
}

export interface GapWordDraft {
  label: string;
}

/** Élément d'un Simon. Une seule face : texte, couleur #rrggbb, ou image. */
export interface SimonElementDraft {
  label: string;
  color: string;
  imageDataUrl?: string;
  /** Vrai quand la liste sait qu'une image existe, sans en envoyer les octets. */
  hasImage?: boolean;
}

/**
 * Question déjà enregistrée, prête pour la liste / l'édition.
 * Les champs d'une autre forme restent vides : le contenu utile dépend de formCode.
 */
export interface SavedQuestion {
  id: number;
  prompt: string;
  formCode: string;
  formLabel: string;
  choices: SavedChoice[];
  pairs: PairDraft[];
  items: ItemDraft[];
  statements: StatementDraft[];
  links: LinkDraft[];
  columns: ColumnDraft[];
  cards: CardDraft[];
  sentence: string;
  answers: GapWordDraft[];
  decoys: GapWordDraft[];
  expectedAnswer: string;
  imageDataUrl: string;
  boardMode: PuzzleBoardMode;
  boardImageDataUrl: string;
  requireAllCorrect: boolean;
  /** true : une consigne par zone juste. false : clics sans ordre. */
  clicksOrdered: boolean;
  zones: ClickZone[];
  snapDistance: number;
  /** Frise Ordre active. False hors forme order. */
  timelineEnabled: boolean;
  /** Genre des éléments du Simon. Null hors forme simon. */
  elementType: SimonElementType | null;
  /** Éléments du Simon, dans l'ordre de l'API : `sequence` désigne leur position. */
  elements: SimonElementDraft[];
  /** Suite du Simon : positions 0-based dans `elements`. */
  sequence: number[];
  /** Réglage renvoyé par l'API. Absent : le panneau n'invente pas un barème. */
  gamification: GamificationDraft | null;
}

/** Genre des éléments d'un Simon, tel que le contrat OpenAPI l'écrit (`elementType`). */
export type SimonElementType = 'couleurs' | 'nombres' | 'lettres' | 'formes';

export const SIMON_ELEMENT_TYPE = {
  COLORS: 'couleurs',
  NUMBERS: 'nombres',
  LETTERS: 'lettres',
  SHAPES: 'formes',
} as const satisfies Record<string, SimonElementType>;

export const SIMON_ELEMENT_TYPES: readonly SimonElementType[] = [
  SIMON_ELEMENT_TYPE.COLORS,
  SIMON_ELEMENT_TYPE.NUMBERS,
  SIMON_ELEMENT_TYPE.LETTERS,
  SIMON_ELEMENT_TYPE.SHAPES,
];

export function isSimonElementType(value: string | null | undefined): value is SimonElementType {
  return value === 'couleurs' || value === 'nombres' || value === 'lettres' || value === 'formes';
}

export function isSimonColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

/**
 * Garde-fou avant l'envoi d'un Simon : ce qui manque encore, ou null.
 * Chaque élément est une image, une couleur, ou un texte. L'API reste juge du WebP.
 */
export function simonDraftError(elements: readonly SimonElementDraft[]): string | null {
  if (elements.length < 2) {
    return 'Il faut au moins deux éléments.';
  }
  for (const element of elements) {
    const faces = [element.label.trim(), element.color.trim(), element.imageDataUrl ?? ''].filter((value) => value !== '');
    if (faces.length !== 1) {
      return 'Chaque élément est une image, une couleur, ou un texte.';
    }
    if (element.color.trim() !== '' && !isSimonColor(element.color)) {
      return 'Une couleur s\'écrit comme #ff0000.';
    }
  }
  return null;
}

/** Plateau de jeu du puzzle : fond dédié, cadre blanc, ou image trouée. */
export type PuzzleBoardMode = 'fond' | 'blanc' | 'trous';

export const PUZZLE_BOARD_MODE = {
  FOND: 'fond',
  BLANC: 'blanc',
  TROUS: 'trous',
} as const satisfies Record<string, PuzzleBoardMode>;

export function isPuzzleBoardMode(value: string | null | undefined): value is PuzzleBoardMode {
  return value === 'fond' || value === 'blanc' || value === 'trous';
}

/** Instantané des champs de saisie pour construire la requête create/update. */
export interface QuestionDraftSnapshot {
  prompt: string;
  choices: ChoiceDraft[];
  pairs: PairDraft[];
  items: ItemDraft[];
  statements: StatementDraft[];
  links: LinkDraft[];
  columns: ColumnDraft[];
  cards: CardDraft[];
  sentence: string;
  answers: GapWordDraft[];
  decoys: GapWordDraft[];
  expectedAnswer: string;
  clickImage: string;
  boardMode: PuzzleBoardMode;
  boardImage: string;
  requireAllCorrect: boolean;
  clicksOrdered: boolean;
  clickZones: ClickZone[];
  puzzleMagnet: number;
  timelineEnabled: boolean;
  simonType: SimonElementType | null;
  simonElements: SimonElementDraft[];
  simonSequence: number[];
  gamification?: GamificationDraft | null;
}

export function isKnownFormCode(code: string | null | undefined): code is KnownFormCode {
  return (
    code === FORM.QCM ||
    code === FORM.MEMORY ||
    code === FORM.ORDER ||
    code === FORM.TRUE_FALSE ||
    code === FORM.LINKS ||
    code === FORM.CASE_VIDE ||
    code === FORM.CLASSIFICATION ||
    code === FORM.TEXTE ||
    code === FORM.REPONSE_LIBRE ||
    code === FORM.IMAGE_CLICK ||
    code === FORM.PUZZLE ||
    code === FORM.SIMON
  );
}

export function emptyDecoys(): GapWordDraft[] {
  return [{ label: '' }];
}

export function emptySimonElements(): SimonElementDraft[] {
  return [
    { label: '', color: '' },
    { label: '', color: '' },
  ];
}

export function emptyLinks(): LinkDraft[] {
  return [
    { leftLabel: '', rightLabel: '' },
    { leftLabel: '', rightLabel: '' },
  ];
}

export function emptyColumns(): ColumnDraft[] {
  return [{ label: '' }, { label: '' }];
}

export function emptyCards(): CardDraft[] {
  return [
    { label: '', columnIndex: 0 },
    { label: '', columnIndex: 1 },
  ];
}

export function emptyStatements(): StatementDraft[] {
  return [
    { label: '', truthful: null },
    { label: '', truthful: null },
  ];
}

export function emptyItems(): ItemDraft[] {
  return [
    { label: '', axisLabel: '' },
    { label: '', axisLabel: '' },
  ];
}

export function emptyPairs(): PairDraft[] {
  return [
    { questionSide: '', answerSide: '' },
    { questionSide: '', answerSide: '' },
  ];
}

export function emptyChoices(): ChoiceDraft[] {
  return [
    { label: '', correct: false },
    { label: '', correct: false },
  ];
}

export function defaultMagnet(): number {
  return MAGNET_DEFAULT;
}

export function withoutHole(sentence: string, index: number): string {
  let count = 0;
  let from = 0;
  while (from <= sentence.length - HOLE.length) {
    const at = sentence.indexOf(HOLE, from);
    if (at < 0) {
      break;
    }
    if (count === index) {
      let start = at;
      let end = at + HOLE.length;
      if (start > 0 && sentence.charAt(start - 1) === ' ') {
        start -= 1;
      } else if (end < sentence.length && sentence.charAt(end) === ' ') {
        end += 1;
      }
      return sentence.slice(0, start) + sentence.slice(end);
    }
    count += 1;
    from = at + HOLE.length;
  }
  return sentence;
}

export function holeCount(sentence: string): number {
  let count = 0;
  let from = 0;
  while (from <= sentence.length - HOLE.length) {
    const at = sentence.indexOf(HOLE, from);
    if (at < 0) {
      break;
    }
    count += 1;
    from = at + HOLE.length;
  }
  return count;
}

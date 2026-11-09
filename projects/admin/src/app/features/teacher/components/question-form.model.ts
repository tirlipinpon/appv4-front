import { ClickZone } from './click-zone';
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
  TEXTE: 'texte',
  REPONSE_LIBRE: 'reponse_libre',
  IMAGE_CLICK: 'image_interactive',
  PUZZLE: 'puzzle',
} as const;

export type KnownFormCode = (typeof FORM)[keyof typeof FORM];

export const HOLE = '___';

export interface ChoiceDraft {
  label: string;
  correct: boolean;
}

export interface SavedChoice {
  label: string;
  correct: boolean;
}

export interface PairDraft {
  questionSide: string;
  answerSide: string;
}

export interface ItemDraft {
  label: string;
}

export interface StatementDraft {
  label: string;
  truthful: boolean | null;
}

export interface LinkDraft {
  leftLabel: string;
  rightLabel: string;
}

export interface GapWordDraft {
  label: string;
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
  sentence: string;
  answers: GapWordDraft[];
  decoys: GapWordDraft[];
  expectedAnswer: string;
  imageDataUrl: string;
  requireAllCorrect: boolean;
  zones: ClickZone[];
  snapDistance: number;
}

/** Instantané des champs de saisie pour construire la requête create/update. */
export interface QuestionDraftSnapshot {
  prompt: string;
  choices: ChoiceDraft[];
  pairs: PairDraft[];
  items: ItemDraft[];
  statements: StatementDraft[];
  links: LinkDraft[];
  sentence: string;
  answers: GapWordDraft[];
  decoys: GapWordDraft[];
  expectedAnswer: string;
  clickImage: string;
  requireAllCorrect: boolean;
  clickZones: ClickZone[];
  puzzleMagnet: number;
}

export function isKnownFormCode(code: string | null | undefined): code is KnownFormCode {
  return (
    code === FORM.QCM ||
    code === FORM.MEMORY ||
    code === FORM.ORDER ||
    code === FORM.TRUE_FALSE ||
    code === FORM.LINKS ||
    code === FORM.CASE_VIDE ||
    code === FORM.TEXTE ||
    code === FORM.REPONSE_LIBRE ||
    code === FORM.IMAGE_CLICK ||
    code === FORM.PUZZLE
  );
}

export function emptyDecoys(): GapWordDraft[] {
  return [{ label: '' }];
}

export function emptyLinks(): LinkDraft[] {
  return [
    { leftLabel: '', rightLabel: '' },
    { leftLabel: '', rightLabel: '' },
  ];
}

export function emptyStatements(): StatementDraft[] {
  return [
    { label: '', truthful: null },
    { label: '', truthful: null },
  ];
}

export function emptyItems(): ItemDraft[] {
  return [{ label: '' }, { label: '' }];
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

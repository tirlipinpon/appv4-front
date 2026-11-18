import type { components } from '../../../core/api/schema';
import type { CreateTeacherSubjectQuestionRequest } from '../../../core/api/api-models';
import { ClickZone, compactClickOrders } from './click-zone';
import {
  FORM,
  KnownFormCode,
  PUZZLE_BOARD_MODE,
  QuestionDraftSnapshot,
  SavedQuestion,
  defaultMagnet,
  isKnownFormCode,
  isPuzzleBoardMode,
} from './question-form.model';

type ApiQuestion = components['schemas']['TeacherSubjectQuestionItem'];

/**
 * Adaptateurs purs entre contrat OpenAPI et modèle UI des questions.
 *
 * <p><b>Business :</b> éviter qu'une question sans id ou une forme inconnue
 * s'affiche / s'enregistre comme si tout allait bien.
 * <p><b>Technique :</b> fonctions sans état Angular ; testables sur fixtures.
 * <p><b>Métier / flow :</b> réponse list/create/update → SavedQuestion ;
 * brouillon éditeur → CreateTeacherSubjectQuestionRequest.
 */

/** Refuse un id absent ou non positif au lieu de fabriquer 0. */
export function parseSavedQuestion(question: ApiQuestion): SavedQuestion | null {
  if (typeof question.id !== 'number' || !Number.isFinite(question.id) || question.id <= 0) {
    return null;
  }
  const choices = (question.choices ?? []).flatMap((choice) => {
    if (!choice.label) {
      return [];
    }
    return [{ label: choice.label, correct: !!choice.correct }];
  });
  const pairs = (question.pairs ?? []).flatMap((pair) => {
    if (!pair.questionSide || !pair.answerSide) {
      return [];
    }
    return [{ questionSide: pair.questionSide, answerSide: pair.answerSide }];
  });
  const items = (question.items ?? []).flatMap((item) => {
    if (!item.label) {
      return [];
    }
    return [{ label: item.label, axisLabel: item.axisLabel ?? '' }];
  });
  const statements = (question.statements ?? []).flatMap((row) => {
    if (!row.label || row.truthful == null) {
      return [];
    }
    return [{ label: row.label, truthful: row.truthful }];
  });
  const links = (question.links ?? []).flatMap((row) => {
    if (!row.leftLabel || !row.rightLabel) {
      return [];
    }
    return [{ leftLabel: row.leftLabel, rightLabel: row.rightLabel }];
  });
  const columns = (question.columns ?? []).flatMap((row) => {
    if (!row.label) {
      return [];
    }
    return [{ label: row.label }];
  });
  const columnIds = (question.columns ?? [])
    .map((row) => row.id)
    .filter((id): id is number => typeof id === 'number');
  const cards = (question.cards ?? []).flatMap((row) => {
    if (!row.label || row.correctColumnId == null) {
      return [];
    }
    const columnIndex = columnIds.indexOf(row.correctColumnId);
    if (columnIndex < 0) {
      return [];
    }
    return [{ label: row.label, columnIndex }];
  });
  const answers = (question.answers ?? []).flatMap((row) => (row.label ? [{ label: row.label }] : []));
  const decoys = (question.decoys ?? []).flatMap((row) => (row.label ? [{ label: row.label }] : []));
  const formCode = question.formCode ?? '';
  return {
    id: question.id,
    prompt: question.prompt ?? '',
    formCode,
    formLabel: question.formLabel ?? '',
    choices,
    pairs,
    items,
    statements,
    links,
    columns,
    cards,
    sentence: question.sentence ?? '',
    answers,
    decoys,
    expectedAnswer: question.expectedAnswer ?? '',
    imageDataUrl: question.imageWebp ? `data:image/webp;base64,${question.imageWebp}` : '',
    boardMode:
      formCode === FORM.PUZZLE && isPuzzleBoardMode(question.boardMode)
        ? question.boardMode
        : PUZZLE_BOARD_MODE.TROUS,
    boardImageDataUrl:
      formCode === FORM.PUZZLE && question.boardImageWebp
        ? `data:image/webp;base64,${question.boardImageWebp}`
        : '',
    requireAllCorrect: question.requireAllCorrect === true,
    zones: formCode === FORM.PUZZLE ? savedPieces(question.pieces) : savedZones(question.zones),
    snapDistance:
      formCode === FORM.PUZZLE && typeof question.snapDistance === 'number'
        ? question.snapDistance
        : defaultMagnet(),
    timelineEnabled: formCode === FORM.ORDER && question.timelineEnabled === true,
  };
}

export function requireSavedQuestion(question: ApiQuestion): SavedQuestion {
  const saved = parseSavedQuestion(question);
  if (!saved) {
    throw new Error('Question sans identifiant valide');
  }
  return saved;
}

/**
 * Construit le body create/update selon la forme.
 * Retourne null si le code n'est pas une forme éditée ici.
 */
export function buildSaveBody(
  code: string | null | undefined,
  draft: QuestionDraftSnapshot,
): CreateTeacherSubjectQuestionRequest | null {
  if (!isKnownFormCode(code)) {
    return null;
  }
  return bodyForForm(code, draft);
}

function bodyForForm(code: KnownFormCode, draft: QuestionDraftSnapshot): CreateTeacherSubjectQuestionRequest {
  switch (code) {
    case FORM.MEMORY:
      return {
        formCode: code,
        prompt: draft.prompt,
        pairs: draft.pairs.map((pair) => ({
          questionSide: pair.questionSide,
          answerSide: pair.answerSide,
        })),
      };
    case FORM.ORDER:
      return {
        formCode: code,
        prompt: draft.prompt,
        timelineEnabled: draft.timelineEnabled,
        items: draft.items.map((item) => ({
          label: item.label,
          ...(draft.timelineEnabled ? { axisLabel: item.axisLabel } : {}),
        })),
      };
    case FORM.TRUE_FALSE:
      return {
        formCode: code,
        prompt: draft.prompt,
        statements: draft.statements.map((row) => ({
          label: row.label,
          ...(row.truthful == null ? {} : { truthful: row.truthful }),
        })),
      };
    case FORM.LINKS:
      return {
        formCode: code,
        prompt: draft.prompt,
        links: draft.links.map((row) => ({
          leftLabel: row.leftLabel,
          rightLabel: row.rightLabel,
        })),
      };
    case FORM.CLASSIFICATION:
      return {
        formCode: code,
        prompt: draft.prompt,
        columns: draft.columns.map((row) => ({ label: row.label })),
        cards: draft.cards.map((row) => ({
          label: row.label,
          columnIndex: row.columnIndex,
        })),
      };
    case FORM.CASE_VIDE:
      return {
        formCode: code,
        prompt: draft.prompt,
        sentence: draft.sentence,
        answers: draft.answers.map((row) => ({ label: row.label })),
        decoys: draft.decoys.map((row) => ({ label: row.label })),
      };
    case FORM.REPONSE_LIBRE:
    case FORM.TEXTE:
      return {
        formCode: code,
        prompt: draft.prompt,
        expectedAnswer: draft.expectedAnswer,
      };
    case FORM.IMAGE_CLICK:
      return {
        formCode: code,
        prompt: draft.prompt,
        imageWebp: webpPayload(draft.clickImage),
        requireAllCorrect: draft.requireAllCorrect,
        zones: compactClickOrders(draft.clickZones).map((zone) => ({
          label: zone.label,
          correct: zone.correct,
          shape: zone.shape,
          points: zone.points.map((point) => ({ x: point.x, y: point.y })),
          ...(zone.correct && zone.clickOrder != null ? { clickOrder: zone.clickOrder } : {}),
        })),
      };
    case FORM.PUZZLE:
      return {
        formCode: code,
        prompt: draft.prompt,
        imageWebp: webpPayload(draft.clickImage),
        boardMode: draft.boardMode,
        boardImageWebp:
          draft.boardMode === PUZZLE_BOARD_MODE.FOND && draft.boardImage
            ? webpPayload(draft.boardImage)
            : '',
        snapDistance: draft.puzzleMagnet,
        pieces: draft.clickZones.map((zone) => ({
          label: zone.label,
          shape: zone.shape,
          points: zone.points.map((point) => ({ x: point.x, y: point.y })),
          ...(draft.boardMode === PUZZLE_BOARD_MODE.BLANC && zone.slot
            ? { slotX: zone.slot.x, slotY: zone.slot.y }
            : {}),
        })),
      };
    case FORM.QCM:
      return {
        formCode: code,
        prompt: draft.prompt,
        choices: draft.choices.map((choice) => ({ label: choice.label, correct: choice.correct })),
      };
  }
}

export function webpPayload(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function savedPieces(pieces: ApiQuestion['pieces']): ClickZone[] {
  return (pieces ?? []).flatMap((piece) => {
    if (!piece.label || !piece.points?.length) {
      return [];
    }
    if (piece.shape !== 'polygon' && piece.shape !== 'rect' && piece.shape !== 'ellipse') {
      return [];
    }
    const points = piece.points.flatMap((point) =>
      point.x == null || point.y == null ? [] : [{ x: point.x, y: point.y }],
    );
    if (!points.length) {
      return [];
    }
    const slot =
      typeof piece.slotX === 'number' &&
      Number.isFinite(piece.slotX) &&
      typeof piece.slotY === 'number' &&
      Number.isFinite(piece.slotY)
        ? { x: piece.slotX, y: piece.slotY }
        : null;
    return [{ label: piece.label, correct: true, shape: piece.shape, points, slot }];
  });
}

function savedZones(zones: ApiQuestion['zones']): ClickZone[] {
  return (zones ?? []).flatMap((zone) => {
    if (!zone.label || zone.correct == null || !zone.points?.length) {
      return [];
    }
    if (zone.shape !== 'polygon' && zone.shape !== 'rect' && zone.shape !== 'ellipse') {
      return [];
    }
    const points = zone.points.flatMap((point) =>
      point.x == null || point.y == null ? [] : [{ x: point.x, y: point.y }],
    );
    if (!points.length) {
      return [];
    }
    const clickOrder =
      zone.correct === true && typeof zone.clickOrder === 'number' && Number.isFinite(zone.clickOrder)
        ? zone.clickOrder
        : null;
    return [{ label: zone.label, correct: zone.correct, shape: zone.shape, points, clickOrder }];
  });
}

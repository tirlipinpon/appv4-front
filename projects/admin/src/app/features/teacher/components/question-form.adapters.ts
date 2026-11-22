import type { components } from '@appv4/api';
import type { CreateTeacherSubjectQuestionRequest } from '../../../core/api/api-models';
import { ClickZone, compactClickOrders } from './click-zone';
import { draftFromItem, gamificationInput } from './question-gamification';
import {
  FORM,
  KnownFormCode,
  PUZZLE_BOARD_MODE,
  QuestionDraftSnapshot,
  SavedQuestion,
  SimonElementDraft,
  defaultMagnet,
  isKnownFormCode,
  isPuzzleBoardMode,
  isSimonElementType,
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
    const face = textFace(choice.label, choice.imageWebp, choice.hasImage);
    if (!face) {
      return [];
    }
    return [{ label: face.label, correct: !!choice.correct, ...imageSource(choice.id), ...face.extra }];
  });
  const pairs = (question.pairs ?? []).flatMap((pair) => {
    const questionSide = textFace(pair.questionSide, pair.questionImageWebp, pair.questionHasImage);
    const answerSide = textFace(pair.answerSide, pair.answerImageWebp, pair.answerHasImage);
    if (!questionSide || !answerSide) {
      return [];
    }
    return [{
      questionSide: questionSide.label,
      answerSide: answerSide.label,
      ...imageSource(pair.id),
      ...(questionSide.extra.imageDataUrl ? { questionImageDataUrl: questionSide.extra.imageDataUrl } : {}),
      ...(questionSide.extra.hasImage ? { questionHasImage: true } : {}),
      ...(answerSide.extra.imageDataUrl ? { answerImageDataUrl: answerSide.extra.imageDataUrl } : {}),
      ...(answerSide.extra.hasImage ? { answerHasImage: true } : {}),
    }];
  });
  const items = (question.items ?? []).flatMap((item) => {
    const face = textFace(item.label, item.imageWebp, item.hasImage);
    if (!face) {
      return [];
    }
    return [{ label: face.label, axisLabel: item.axisLabel ?? '', ...imageSource(item.id), ...face.extra }];
  });
  const statements = (question.statements ?? []).flatMap((row) => {
    const face = textFace(row.label, row.imageWebp, row.hasImage);
    if (!face || row.truthful == null) {
      return [];
    }
    return [{ label: face.label, truthful: row.truthful, ...imageSource(row.id), ...face.extra }];
  });
  const links = (question.links ?? []).flatMap((row) => {
    const left = textFace(row.leftLabel, row.leftImageWebp, row.leftHasImage);
    const right = textFace(row.rightLabel, row.rightImageWebp, row.rightHasImage);
    if (!left || !right) {
      return [];
    }
    return [{
      leftLabel: left.label,
      rightLabel: right.label,
      ...imageSource(row.id),
      ...(left.extra.imageDataUrl ? { leftImageDataUrl: left.extra.imageDataUrl } : {}),
      ...(left.extra.hasImage ? { leftHasImage: true } : {}),
      ...(right.extra.imageDataUrl ? { rightImageDataUrl: right.extra.imageDataUrl } : {}),
      ...(right.extra.hasImage ? { rightHasImage: true } : {}),
    }];
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
    const face = textFace(row.label, row.imageWebp, row.hasImage);
    if (!face || row.correctColumnId == null) {
      return [];
    }
    const columnIndex = columnIds.indexOf(row.correctColumnId);
    if (columnIndex < 0) {
      return [];
    }
    return [{ label: face.label, columnIndex, ...imageSource(row.id), ...face.extra }];
  });
  const answers = (question.answers ?? []).flatMap((row) => (row.label ? [{ label: row.label }] : []));
  const decoys = (question.decoys ?? []).flatMap((row) => (row.label ? [{ label: row.label }] : []));
  const formCode = question.formCode ?? '';
  const simon = formCode === FORM.SIMON;
  const elements = simon ? savedSimonElements(question.elements) : [];
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
    clicksOrdered: question.clicksOrdered !== false,
    zones: formCode === FORM.PUZZLE ? savedPieces(question.pieces) : savedZones(question.zones),
    snapDistance:
      formCode === FORM.PUZZLE && typeof question.snapDistance === 'number'
        ? question.snapDistance
        : defaultMagnet(),
    timelineEnabled: formCode === FORM.ORDER && question.timelineEnabled === true,
    elementType: simon && isSimonElementType(question.elementType) ? question.elementType : null,
    elements,
    sequence: simon
      ? (question.sequence ?? []).filter((step) => Number.isInteger(step) && step >= 0 && step < elements.length)
      : [],
    gamification: draftFromItem(question.gamification),
  };
}

export function requireSavedQuestion(question: ApiQuestion): SavedQuestion {
  const saved = parseSavedQuestion(question);
  if (!saved) {
    throw new Error('Question sans identifiant valide');
  }
  return saved;
}

function imageSource(id: number | undefined) {
  return id == null ? {} : { sourceId: id };
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
  const body = bodyForForm(code, draft);
  if (!body) {
    return null;
  }
  const gamification = gamificationInput(draft.gamification);
  return gamification ? { ...body, gamification } : body;
}

function bodyForForm(code: KnownFormCode, draft: QuestionDraftSnapshot): CreateTeacherSubjectQuestionRequest | null {
  switch (code) {
    case FORM.MEMORY:
      return {
        formCode: code,
        prompt: draft.prompt,
        pairs: draft.pairs.map((pair) => ({
          ...(pair.questionImageDataUrl
            ? { questionImageWebp: webpPayload(pair.questionImageDataUrl) }
            : { questionSide: pair.questionSide }),
          ...(pair.answerImageDataUrl
            ? { answerImageWebp: webpPayload(pair.answerImageDataUrl) }
            : { answerSide: pair.answerSide }),
        })),
      };
    case FORM.ORDER:
      return {
        formCode: code,
        prompt: draft.prompt,
        timelineEnabled: draft.timelineEnabled,
        items: draft.items.map((item) => ({
          ...(item.imageDataUrl
            ? { imageWebp: webpPayload(item.imageDataUrl) }
            : { label: item.label }),
          ...(draft.timelineEnabled ? { axisLabel: item.axisLabel } : {}),
        })),
      };
    case FORM.TRUE_FALSE: {
      const statements = draft.statements.filter((row) => row.label.trim() !== '' || !!row.imageDataUrl);
      if (statements.some((row) => row.truthful == null)) {
        return null;
      }
      return {
        formCode: code,
        prompt: draft.prompt,
        statements: statements.map((row) =>
          row.imageDataUrl
            ? { imageWebp: webpPayload(row.imageDataUrl), truthful: row.truthful === true }
            : { label: row.label, truthful: row.truthful === true },
        ),
      };
    }
    case FORM.LINKS:
      return {
        formCode: code,
        prompt: draft.prompt,
        links: draft.links.map((row) => ({
          ...(row.leftImageDataUrl
            ? { leftImageWebp: webpPayload(row.leftImageDataUrl) }
            : { leftLabel: row.leftLabel }),
          ...(row.rightImageDataUrl
            ? { rightImageWebp: webpPayload(row.rightImageDataUrl) }
            : { rightLabel: row.rightLabel }),
        })),
      };
    case FORM.CLASSIFICATION:
      return {
        formCode: code,
        prompt: draft.prompt,
        columns: draft.columns.map((row) => ({ label: row.label })),
        cards: draft.cards.map((row) => ({
          ...(row.imageDataUrl
            ? { imageWebp: webpPayload(row.imageDataUrl) }
            : { label: row.label }),
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
        clicksOrdered: draft.clicksOrdered,
        zones: compactClickOrders(draft.clickZones).map((zone) => ({
          label: zone.label,
          correct: zone.correct,
          shape: zone.shape,
          points: zone.points.map((point) => ({ x: point.x, y: point.y })),
          ...(draft.clicksOrdered && zone.correct && zone.clickOrder != null
            ? { clickOrder: zone.clickOrder }
            : {}),
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
          ...((draft.boardMode === PUZZLE_BOARD_MODE.BLANC || draft.boardMode === PUZZLE_BOARD_MODE.FOND) &&
          zone.slot
            ? { slotX: zone.slot.x, slotY: zone.slot.y }
            : {}),
          ...(draft.boardMode === PUZZLE_BOARD_MODE.FOND && zone.slot?.width != null
            ? { slotWidth: zone.slot.width }
            : {}),
        })),
      };
    case FORM.SIMON:
      return {
        formCode: code,
        prompt: draft.prompt,
        elementType: 'libre',
        elements: draft.simonElements.map((element) =>
          element.imageDataUrl
            ? { imageWebp: webpPayload(element.imageDataUrl) }
            : element.color.trim()
              ? { color: element.color.trim() }
              : { label: element.label },
        ),
      };
    case FORM.QCM:
      return {
        formCode: code,
        prompt: draft.prompt,
        choices: draft.choices.map((choice) =>
          choice.imageDataUrl
            ? { imageWebp: webpPayload(choice.imageDataUrl), correct: choice.correct }
            : { label: choice.label, correct: choice.correct },
        ),
      };
  }
}

export function webpPayload(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/** Une pièce enregistrée : texte, ou image (octets ou simple drapeau de la liste). */
function textFace(
  label: string | undefined,
  imageWebp: string | undefined,
  hasImage: boolean | undefined,
): { label: string; extra: { imageDataUrl?: string; hasImage?: boolean } } | null {
  const imageDataUrl = imageWebp ? `data:image/webp;base64,${imageWebp}` : undefined;
  const image = hasImage === true || !!imageDataUrl;
  if (!label && !image) {
    return null;
  }
  return {
    label: imageDataUrl ? '' : (label ?? ''),
    extra: {
      ...(imageDataUrl ? { imageDataUrl } : {}),
      ...(image ? { hasImage: true } : {}),
    },
  };
}

/** Garde chaque élément, même sans nom : retirer une ligne décalerait les positions de la suite. */
function savedSimonElements(elements: ApiQuestion['elements']): SimonElementDraft[] {
  return (elements ?? []).map((element) => {
    const imageDataUrl = element.imageWebp ? `data:image/webp;base64,${element.imageWebp}` : undefined;
    const draft: SimonElementDraft = {
      label: imageDataUrl || element.color ? '' : (element.label ?? ''),
      color: imageDataUrl ? '' : (element.color ?? ''),
      ...imageSource(element.id),
    };
    if (imageDataUrl) {
      draft.imageDataUrl = imageDataUrl;
    }
    if (element.hasImage === true || imageDataUrl) {
      draft.hasImage = true;
    }
    return draft;
  });
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
        ? {
            x: piece.slotX,
            y: piece.slotY,
            ...(typeof piece.slotWidth === 'number' && Number.isFinite(piece.slotWidth)
              ? { width: piece.slotWidth }
              : {}),
          }
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

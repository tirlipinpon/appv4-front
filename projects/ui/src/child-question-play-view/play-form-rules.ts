import type { components } from '@appv4/api';
import type { ChildQuestionPlayViewComponent } from './child-question-play-view.component';
import type { ChildPlayViewQuestion } from './child-question-play-view.model';

export type PlayQuestion = components['schemas']['PlayQuestionResponse'];
export type PlayFormCode = PlayQuestion['formCode'];
export type PlayAnswer = components['schemas']['PreviewPlayAnswer'];

interface PlayFormRule<Form extends PlayFormCode> {
  ready(view: ChildQuestionPlayViewComponent): boolean;
  answer(view: ChildQuestionPlayViewComponent): Extract<PlayAnswer, { formCode: Form }>;
}

export const playForms = {
  qcm: {
    ready: (view) => view.selectedChoiceIds().length > 0,
    answer: (view) => ({ formCode: 'qcm', selectedChoiceIds: view.selectedChoiceIds() }),
  },
  vrai_faux: {
    ready: (view) => view.allStatementsAnswered(),
    answer: (view) => ({ formCode: 'vrai_faux', statements: view.statementAnswers() }),
  },
  memory: {
    ready: (view) => view.allPairsMatched(),
    answer: (view) => ({ formCode: 'memory', memoryMatches: view.memoryMatches() }),
  },
  order: {
    ready: (view) => view.hasOrderItems(),
    answer: (view) => ({ formCode: 'order', orderedItemIds: view.orderedItemIds() }),
  },
  classement: {
    ready: (view) => view.allCardsPlaced(),
    answer: (view) => ({ formCode: 'classement', placements: view.placements() }),
  },
  liens: {
    ready: (view) => view.allLinksMatched(),
    answer: (view) => ({ formCode: 'liens', linkSelections: view.linkSelections() }),
  },
  case_vide: {
    ready: (view) => view.allGapsFilled(),
    answer: (view) => ({ formCode: 'case_vide', gapFills: view.gapFills() }),
  },
  image_interactive: {
    ready: (view) => view.imageReady(),
    answer: (view) => ({ formCode: 'image_interactive', zoneClicks: view.zoneClicks().map((zoneId) => ({ zoneId })) }),
  },
  reponse_libre: {
    ready: (view) => view.allLettersFilled(),
    answer: (view) => ({ formCode: 'reponse_libre', attempt: view.letterAttempt() }),
  },
  texte: {
    ready: (view) => view.freeTextAttempt().trim().length > 0,
    answer: (view) => ({ formCode: 'texte', attempt: view.freeTextAttempt() }),
  },
  puzzle: {
    ready: (view) => view.allPuzzlePiecesPlaced(),
    answer: (view) => ({ formCode: 'puzzle', puzzlePlacements: view.puzzlePlacements() }),
  },
  simon: {
    ready: (view) => view.simonComplete() || view.simonMissed(),
    answer: (view) => ({ formCode: 'simon', simonSequence: view.simonReplay() }),
  },
} satisfies { [Form in PlayFormCode]: PlayFormRule<Form> };

export function isPlayableQuestionForm(code: string | undefined): code is PlayFormCode {
  return code !== undefined && Object.hasOwn(playForms, code);
}

export function autoSubmitQuestion(model: ChildPlayViewQuestion | null): boolean {
  return model?.formCode === 'simon' || (model?.formCode === 'image_interactive' && model.clicksOrdered === true);
}

export function toPlayModel(question: PlayQuestion): ChildPlayViewQuestion {
  return {
    ...(question.formCode === 'texte' ? {} : question.content),
    formCode: question.formCode,
    formLabel: question.formLabel,
    formIconCode: question.iconCode,
    formColor: question.color,
    prompt: question.prompt || (question.formCode === 'memory' ? 'Memory' : question.formCode === 'order' ? 'Ordre' : ''),
  };
}

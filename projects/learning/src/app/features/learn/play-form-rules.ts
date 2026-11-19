import type { ChildQuestionPlayViewComponent } from '@appv4/ui';
import type { SubmitChildAttemptRequest } from '../../core/api/api-models';

interface PlayFormRules {
  ready(view: ChildQuestionPlayViewComponent): boolean;
  answer(view: ChildQuestionPlayViewComponent): SubmitChildAttemptRequest;
}

export const playForms: ReadonlyMap<string, PlayFormRules> = new Map<string, PlayFormRules>([
  ['qcm', {
    ready: (view) => view.selectedChoiceIds().length > 0,
    answer: (view) => ({ selectedChoiceIds: view.selectedChoiceIds() }),
  }],
  ['vrai_faux', {
    ready: (view) => view.allStatementsAnswered(),
    answer: (view) => ({ statements: view.statementAnswers() }),
  }],
  ['memory', {
    ready: (view) => view.allPairsMatched(),
    answer: (view) => ({ matchedPairIds: view.matchedPairIds() }),
  }],
  ['order', {
    ready: (view) => view.hasOrderItems(),
    answer: (view) => ({ orderedItemIds: view.orderedItemIds() }),
  }],
  ['classement', {
    ready: (view) => view.allCardsPlaced(),
    answer: (view) => ({ placements: view.placements() }),
  }],
  ['liens', {
    ready: (view) => view.allLinksMatched(),
    answer: (view) => ({ linkMatches: view.linkMatches() }),
  }],
  ['case_vide', {
    ready: (view) => view.allGapsFilled(),
    answer: (view) => ({ gapFills: view.gapFills() }),
  }],
  ['image_interactive', {
    ready: (view) => view.imageReady(),
    answer: (view) => ({ zoneClicks: view.zoneClicks().map((zoneId) => ({ zoneId })) }),
  }],
  ['reponse_libre', {
    ready: (view) => view.allLettersFilled(),
    answer: (view) => ({ attempt: view.letterAttempt() }),
  }],
  ['texte', {
    ready: (view) => view.freeTextAttempt().trim().length > 0,
    answer: (view) => ({ attempt: view.freeTextAttempt() }),
  }],
  ['puzzle', {
    ready: (view) => view.allPuzzlePiecesPlaced(),
    answer: (view) => ({ puzzlePlacements: view.puzzlePlacements() }),
  }],
  ['simon', {
    ready: (view) => view.simonComplete() || view.simonMissed(),
    answer: (view) => ({ simonSequence: view.simonReplay() }),
  }],
]);

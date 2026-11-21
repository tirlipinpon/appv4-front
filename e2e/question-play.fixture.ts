import type { Page } from '@playwright/test';

export interface QuestionFixture {
  formCode: string;
  formLabel?: string;
  prompt: string;
  choices?: { choiceId?: number; label: string }[];
  statements?: { statementId?: number; label: string }[];
  pairs?: { pairId?: number; questionSide: string; answerSide: string }[];
  items?: { itemId?: number; label: string; axisLabel?: string }[];
  timelineEnabled?: boolean;
  columns?: { columnId?: number; id?: number; label: string }[];
  cards?: { cardId?: number; label: string }[];
  links?: { linkId?: number; leftLabel: string; rightLabel: string }[];
  sentence?: string;
  words?: { wordId: number; label: string }[];
  answers?: { label: string }[];
  decoys?: { label: string }[];
}

interface MemoryMatch {
  firstCardId: string;
  secondCardId: string;
}

interface AttemptBody {
  selectedChoiceIds?: number[];
  statements?: { statementId: number; value: boolean }[];
  memoryMatches?: MemoryMatch[];
  orderedItemIds?: number[];
  placements?: { cardId: number; columnId: number }[];
  linkSelections?: { leftId: string; rightId: string }[];
  gapFills?: { holeIndex: number; wordId: number }[];
  attempt?: string;
}

export async function mockQuestionPlay(
  page: Page, path: string, subjectId: number, questionId: number, question: QuestionFixture, preview = false,
): Promise<void> {
  const columns = (question.columns ?? []).map(({ columnId, id, label }, index) => ({ columnId: columnId ?? id ?? index + 1, label }));
  const words = question.words ?? [...(question.answers ?? []), ...(question.decoys ?? [])]
    .map(({ label }, index) => ({ wordId: index + 1, label }));
  const cards = (question.pairs ?? []).flatMap((pair, index) => {
    const id = pair.pairId ?? index + 1;
    return [{ cardId: `${id}-q`, label: pair.questionSide }, { cardId: `${id}-a`, label: pair.answerSide }];
  });
  const links = question.links ?? [];
  const content = {
    choices: question.choices?.map(({ label, choiceId }, index) => ({ choiceId: choiceId ?? index + 1, label })),
    statements: question.statements?.map(({ label, statementId }, index) => ({ statementId: statementId ?? index + 1, label })),
    items: question.items?.map(({ label, axisLabel, itemId }, index) => ({ itemId: itemId ?? index + 1, label, axisLabel })),
    timelineEnabled: question.timelineEnabled,
    memoryCards: question.pairs ? cards : undefined,
    columns: question.columns ? columns : undefined,
    cards: question.cards?.map(({ label, cardId }, index) => ({ cardId: cardId ?? index + 1, label })),
    linkLefts: question.links ? links.map(({ linkId, leftLabel }, index) => ({
      optionId: String(linkId ?? index + 1), label: leftLabel,
    })) : undefined,
    linkRights: question.links ? links.map(({ linkId, rightLabel }, index) => ({
      optionId: `right-${linkId ?? index + 1}`, label: rightLabel,
    })) : undefined,
    sentence: question.sentence,
    words: question.sentence ? words : undefined,
  };
  const playPath = preview ? path : `${path}/play`;
  await page.route((url) => url.pathname === playPath, (route) => route.fulfill({
    json: {
      questionId, subjectId, formCode: question.formCode, formLabel: question.formLabel, prompt: question.prompt,
      maxAttempts: 2, attemptsRemaining: 2, content,
    },
  }));
  await page.route((url) => url.pathname === `${path}/memory-pair`, (route) => {
    const match = route.request().postDataJSON() as MemoryMatch;
    return route.fulfill({ json: { matched: memoryMatch(match) } });
  });
  await page.route((url) => url.pathname === `${path}/attempts`, (route) => {
    const request = route.request().postDataJSON();
    const answer = (preview ? request.answer : request) as AttemptBody;
    const result = fixtureVerdict(question.formCode, answer, columns.map((row) => row.columnId), words.map((row) => row.wordId));
    return route.fulfill({
      status: preview ? 200 : 201,
      json: {
        attemptId: 1, ...result, attemptRank: 1, attemptsRemaining: 1,
        pointsAwarded: result.passed ? 10 : 0, replayAvailable: true,
      },
    });
  });
}

function memoryMatch(match: MemoryMatch): boolean {
  return match.firstCardId !== match.secondCardId &&
    match.firstCardId.slice(0, -2) === match.secondCardId.slice(0, -2);
}

function fixtureVerdict(formCode: string, answer: AttemptBody, columns: number[], words: number[]) {
  const percent = (correct: number, total: number) => ({
    passed: correct === total, scorePercent: Math.round(100 * correct / total),
  });
  switch (formCode) {
    case 'qcm':
      return percent(Number(answer.selectedChoiceIds?.length === 1 && answer.selectedChoiceIds[0] === 2), 1);
    case 'vrai_faux':
      return percent((answer.statements ?? []).filter((row) => row.value === (row.statementId === 1)).length, 2);
    case 'memory':
      return percent((answer.memoryMatches ?? []).filter(memoryMatch).length, 2);
    case 'order':
      return percent((answer.orderedItemIds ?? []).filter((id, index) => id === index + 1).length, 3);
    case 'classement':
      return percent((answer.placements ?? []).filter(({ cardId, columnId }) => columns[cardId - 1] === columnId).length, 2);
    case 'liens':
      return percent((answer.linkSelections ?? []).filter(({ leftId, rightId }) => rightId === `right-${leftId}`).length, 2);
    case 'case_vide':
      return percent((answer.gapFills ?? []).filter(({ holeIndex, wordId }) => words[holeIndex] === wordId).length, 2);
    default: {
      const text = (answer.attempt ?? '').trim().toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '');
      return percent(Number(text === 'paris'), 1);
    }
  }
}

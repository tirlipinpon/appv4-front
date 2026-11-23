import { expect, test, type Page, type Route } from '@playwright/test';
import { mockQuestionPlay, type QuestionFixture } from './question-play.fixture';

/**
 * Parcours enfant : jouer les six formes (QCM, Memory, Ordre, Vrai/Faux,
 * Classement, Liens). L'API est simulée. Le score affiché est celui renvoyé.
 */

test.use({ baseURL: 'http://localhost:4200', viewport: { width: 1280, height: 1200 } });

const ui = {
  panel: 'play-question-panel',
  prompt: 'child-play-view-prompt',
  submit: 'play-submit',
  result: 'play-result',
  score: 'play-score',
  replay: 'play-replay',
  choice: 'child-play-view-choice',
  tf: 'child-play-view-tf',
  memoryCard: 'child-play-view-memory-card',
  order: 'child-play-view-order',
  orderItem: 'child-play-view-order-item',
  orderUp: 'child-play-view-order-up',
  orderDown: 'child-play-view-order-down',
  orderAxis: 'child-play-view-order-axis',
  classCard: 'child-play-view-class-card',
  classColumn: 'child-play-view-class-column',
  linkLeft: 'child-play-view-link-left',
  linkRight: 'child-play-view-link-right',
  gapWord: 'child-play-view-gap-word',
  gapHole: 'child-play-view-gap-hole',
  gapLine: 'child-play-view-gaps',
  freeText: 'child-play-view-free-text',
} as const;

const SUBJECT_ID = 4;
const QUESTION_ID = 42;

test.describe('Jouer une question', { tag: ['@learning', '@mock'] }, () => {
  test.describe.configure({ mode: 'parallel' });

  test('QCM : Valider reste inactif tant qu aucun choix n est fait', async ({ page }) => {
    await openPlay(page, qcmQuestion());
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('QCM : la bonne réponse donne Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPlay(page, qcmQuestion());
    await page.getByTestId(`${ui.choice}-2`).click();
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('QCM : un mauvais choix affiche Pas encore', async ({ page }) => {
    await openPlay(page, qcmQuestion());
    await page.getByTestId(`${ui.choice}-1`).click();
    await submitAndExpect(page, false, '0');
  });

  test('Memory : Valider reste inactif après une seule paire', async ({ page }) => {
    await openPlay(page, memoryQuestion());
    await matchMemory(page, [1]);
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Memory : une fausse paire ne débloque pas Valider', async ({ page }) => {
    await openPlay(page, memoryQuestion());
    await page.getByTestId(`${ui.memoryCard}-1-q`).click();
    await page.getByTestId(`${ui.memoryCard}-2-a`).click();
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Memory : les deux paires donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPlay(page, memoryQuestion());
    await matchMemory(page, [1, 2]);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test("Ordre : la frise est visible et Valider l'ordre est déjà actif", async ({ page }) => {
    await openPlay(page, orderQuestion());
    await expect(page.getByTestId(`${ui.orderAxis}-1`)).toHaveText('matin');
    await expect(page.getByTestId(`${ui.orderAxis}-2`)).toHaveText('midi');
    await expect(page.getByTestId(`${ui.orderAxis}-3`)).toHaveText('soir');
    await expect(page.getByTestId(ui.submit)).toBeEnabled();
  });

  test("Ordre : le bon ordre donne Bravo et Rejouer ramène Valider l'ordre", async ({ page }) => {
    await openPlay(page, orderQuestion());
    await arrangeOrder(page, [1, 2, 3]);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Ordre : un ordre mélangé affiche Pas encore', async ({ page }) => {
    await openPlay(page, orderQuestion());
    await disorder(page, [1, 2, 3]);
    await submitAndExpect(page, false);
  });

  test("Vrai/Faux : Valider reste inactif tant qu'une affirmation n'a pas de réponse", async ({ page }) => {
    await openPlay(page, trueFalseQuestion());
    await page.getByTestId(`${ui.tf}-1-true`).click();
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Vrai/Faux : les deux bonnes réponses donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPlay(page, trueFalseQuestion());
    await page.getByTestId(`${ui.tf}-1-true`).click();
    await page.getByTestId(`${ui.tf}-2-false`).click();
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Vrai/Faux : une affirmation fausse affiche Pas encore', async ({ page }) => {
    await openPlay(page, trueFalseQuestion());
    await page.getByTestId(`${ui.tf}-1-true`).click();
    await page.getByTestId(`${ui.tf}-2-true`).click();
    await submitAndExpect(page, false, '50');
  });

  test('Classement : Valider reste inactif tant qu une carte reste à placer', async ({ page }) => {
    await openPlay(page, classementQuestion());
    await placeCards(page, [[1, 10]]);
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Classement : les bonnes colonnes donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPlay(page, classementQuestion());
    await placeCards(page, [
      [1, 10],
      [2, 11],
    ]);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Classement : les colonnes inversées affichent Pas encore', async ({ page }) => {
    await openPlay(page, classementQuestion());
    await placeCards(page, [
      [1, 11],
      [2, 10],
    ]);
    await submitAndExpect(page, false, '0');
  });

  test('Liens : Valider reste inactif tant qu un mot n est pas relié', async ({ page }) => {
    await openPlay(page, liensQuestion());
    await pairLinks(page, [[1, 1]]);
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Liens : les bonnes associations donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPlay(page, liensQuestion());
    await pairLinks(page, [
      [1, 1],
      [2, 2],
    ]);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Liens : les associations croisées affichent Pas encore', async ({ page }) => {
    await openPlay(page, liensQuestion());
    await pairLinks(page, [
      [1, 2],
      [2, 1],
    ]);
    await submitAndExpect(page, false, '0');
  });

  test('Case vide : Valider reste inactif tant qu un trou est vide', async ({ page }) => {
    await openPlay(page, gapsQuestion());
    await placeGaps(page, [[10, 0]]);
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Case vide : les bons mots donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPlay(page, gapsQuestion());
    await placeGaps(page, [
      [10, 0],
      [11, 1],
    ]);
    const line = page.getByTestId(ui.gapLine);
    const box = await line.boundingBox();
    expect(box?.height ?? 0).toBeLessThan(56);
    const scrolls = await line.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(scrolls).toBe(false);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Case vide : un leurre affiche Pas encore', async ({ page }) => {
    await openPlay(page, gapsQuestion());
    await placeGaps(page, [
      [10, 0],
      [12, 1],
    ]);
    await submitAndExpect(page, false, '50');
  });

  test('Case vide : glisser un mot dans le trou le place', async ({ page }) => {
    await openPlay(page, gapsQuestion());
    await dragGap(page, 10, 0);
    await dragGap(page, 11, 1);
    await expect(page.getByTestId(`${ui.gapHole}-0`)).toContainText('chat');
    await expect(page.getByTestId(`${ui.gapHole}-1`)).toContainText('pomme');
    await submitAndExpect(page, true, '100');
  });

  test('Réponse libre : Valider reste inactif tant que le champ est vide', async ({ page }) => {
    await openPlay(page, freeTextQuestion());
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
    await page.getByTestId(ui.freeText).fill('   ');
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Réponse libre : Pâris donne Bravo et Rejouer vide le champ', async ({ page }) => {
    await openPlay(page, freeTextQuestion());
    await page.getByTestId(ui.freeText).fill('  Pâris  ');
    await submitAndExpect(page, true, '100');
    await replay(page);
    await expect(page.getByTestId(ui.freeText)).toHaveValue('');
  });

  test('Réponse libre : Lyon affiche Pas encore', async ({ page }) => {
    await openPlay(page, freeTextQuestion());
    await page.getByTestId(ui.freeText).fill('Lyon');
    await submitAndExpect(page, false, '0');
  });
});

function freeTextQuestion(): QuestionFixture {
  return {
    formCode: 'texte',
    prompt: 'Capitale de la France',
  };
}

function qcmQuestion(): QuestionFixture {
  return {
    formCode: 'qcm',
    prompt: 'Lequel est un fruit ?',
    choices: [
      { choiceId: 1, label: 'Pierre' },
      { choiceId: 2, label: 'Poire' },
    ],
  };
}

function memoryQuestion(): QuestionFixture {
  return {
    formCode: 'memory',
    prompt: 'Retrouve les paires',
    pairs: [
      { pairId: 1, questionSide: 'chat', answerSide: 'miaou' },
      { pairId: 2, questionSide: 'chien', answerSide: 'ouaf' },
    ],
  };
}

function orderQuestion(): QuestionFixture {
  return {
    formCode: 'order',
    prompt: 'Remets la journée dans l ordre',
    timelineEnabled: true,
    items: [
      { itemId: 1, label: 'lever', axisLabel: 'matin' },
      { itemId: 2, label: 'déjeuner', axisLabel: 'midi' },
      { itemId: 3, label: 'dîner', axisLabel: 'soir' },
    ],
  };
}

function trueFalseQuestion(): QuestionFixture {
  return {
    formCode: 'vrai_faux',
    prompt: 'Vrai ou faux ?',
    statements: [
      { statementId: 1, label: 'Deux et deux font quatre' },
      { statementId: 2, label: 'Trois et trois font sept' },
    ],
  };
}

function classementQuestion(): QuestionFixture {
  return {
    formCode: 'classement',
    prompt: 'Range chaque carte',
    columns: [
      { columnId: 10, label: 'Fruit' },
      { columnId: 11, label: 'Légume' },
    ],
    cards: [
      { cardId: 1, label: 'Poire' },
      { cardId: 2, label: 'Carotte' },
    ],
  };
}

function gapsQuestion(): QuestionFixture {
  return {
    formCode: 'case_vide',
    prompt: 'Complète la phrase',
    sentence: 'Le ___ mange une ___.',
    words: [
      { wordId: 10, label: 'chat' },
      { wordId: 11, label: 'pomme' },
      { wordId: 12, label: 'voiture' },
    ],
  };
}

function liensQuestion(): QuestionFixture {
  return {
    formCode: 'liens',
    prompt: 'Relie chaque mot',
    links: [
      { linkId: 1, leftLabel: 'un', rightLabel: '1' },
      { linkId: 2, leftLabel: 'deux', rightLabel: '2' },
    ],
  };
}

async function openPlay(page: Page, question: QuestionFixture): Promise<void> {
  await page.route((url) => url.pathname.startsWith('/api/'), (route) => route.fulfill({ status: 404 }));
  await page.addInitScript((token) => {
    sessionStorage.setItem('learning.jwt', token);
  }, 'child-token');
  await page.route(
    (url) => url.pathname === '/api/ext/me',
    async (route) => {
      await json(route, { childId: 1, firstName: 'Akira', hasPhoto: false });
    },
  );
  await mockQuestionPlay(
    page, `/api/ext/subjects/${SUBJECT_ID}/questions/${QUESTION_ID}`, SUBJECT_ID, QUESTION_ID, question,
  );
  await page.goto(`/learn/${SUBJECT_ID}/play/${QUESTION_ID}`);
  await expect(page.getByTestId(ui.panel)).toBeVisible();
  await expect(page.getByTestId(ui.prompt)).toBeVisible();
}


async function submitAndExpect(page: Page, passed: boolean, score?: string): Promise<void> {
  await expect(page.getByTestId(ui.submit)).toBeEnabled();
  await page.getByTestId(ui.submit).click();
  const result = page.getByTestId(ui.result);
  await expect(result).toContainText(passed ? 'Bravo' : 'Pas encore');
  if (score != null) {
    await expect(page.getByTestId(ui.score)).toContainText(score);
  } else {
    await expect(page.getByTestId(ui.score)).not.toContainText('100');
  }
}

async function replay(page: Page): Promise<void> {
  await page.getByTestId(ui.replay).click();
  await expect(page.getByTestId(ui.result)).toHaveCount(0);
  await expect(page.getByTestId(ui.submit)).toBeVisible();
}

async function matchMemory(page: Page, pairIds: number[]): Promise<void> {
  for (const pairId of pairIds) {
    await page.getByTestId(`${ui.memoryCard}-${pairId}-q`).click();
    await page.getByTestId(`${ui.memoryCard}-${pairId}-a`).click();
  }
}

async function placeCards(page: Page, pairs: readonly (readonly [number, number])[]): Promise<void> {
  for (const [cardId, columnId] of pairs) {
    await page.getByTestId(`${ui.classCard}-${cardId}`).click();
    await page.getByTestId(`${ui.classColumn}-${columnId}`).click();
  }
}

async function placeGaps(page: Page, pairs: readonly (readonly [number, number])[]): Promise<void> {
  for (const [wordId, holeIndex] of pairs) {
    await page.getByTestId(`${ui.gapHole}-${holeIndex}`).click();
    await page.getByTestId(`${ui.gapWord}-w-${wordId}`).click();
  }
}

async function dragGap(page: Page, wordId: number, holeIndex: number): Promise<void> {
  const word = page.getByTestId(`${ui.gapWord}-w-${wordId}`);
  const hole = page.getByTestId(`${ui.gapHole}-${holeIndex}`);
  const wordBox = await word.boundingBox();
  const holeBox = await hole.boundingBox();
  if (wordBox == null || holeBox == null) {
    throw new Error('mot ou trou introuvable');
  }
  const startX = wordBox.x + wordBox.width / 2;
  const startY = wordBox.y + wordBox.height / 2;
  const endX = holeBox.x + Math.min(16, holeBox.width / 2);
  const endY = holeBox.y + holeBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 20, startY, { steps: 6 });
  await page.mouse.move(endX, endY, { steps: 12 });
  const during = await hole.boundingBox();
  if (during != null && Math.abs(during.width - holeBox.width) > 2) {
    throw new Error(`le trou change de largeur (${holeBox.width} → ${during.width})`);
  }
  await page.mouse.up();
}

async function pairLinks(page: Page, pairs: readonly (readonly [number, number])[]): Promise<void> {
  for (const [leftId, rightId] of pairs) {
    await page.getByTestId(`${ui.linkLeft}-l-${leftId}`).click();
    await page.getByTestId(`${ui.linkRight}-r-right-${rightId}`).click();
  }
}

async function arrangeOrder(page: Page, expected: number[]): Promise<void> {
  for (let target = 0; target < expected.length; target++) {
    const id = expected[target]!;
    for (let step = 0; step < expected.length; step++) {
      const current = await readOrder(page);
      const index = current.indexOf(id);
      if (index === target) {
        break;
      }
      const item = page.getByTestId(`${ui.orderItem}-${id}`);
      const move = index > target ? item.getByTestId(ui.orderUp) : item.getByTestId(ui.orderDown);
      await move.click();
      await expect.poll(async () => (await readOrder(page)).join(',')).not.toBe(current.join(','));
    }
  }
  await expect.poll(async () => (await readOrder(page)).join(',')).toBe(expected.join(','));
}

async function disorder(page: Page, expected: number[]): Promise<void> {
  const current = await readOrder(page);
  const alreadyWrong = current.some((id, index) => id !== expected[index]);
  if (!alreadyWrong) {
    await page.getByTestId(`${ui.orderItem}-${expected[0]}`).getByTestId(ui.orderDown).click();
    await expect.poll(async () => (await readOrder(page)).join(',')).not.toBe(current.join(','));
  }
  const next = await readOrder(page);
  expect(next.some((id, index) => id !== expected[index])).toBe(true);
}

async function readOrder(page: Page): Promise<number[]> {
  return page.getByTestId(ui.order).locator('[data-testid^="child-play-view-order-item-"]').evaluateAll((nodes) =>
    nodes.map((node) => Number((node.getAttribute('data-testid') ?? '').replace('child-play-view-order-item-', ''))),
  );
}

async function json(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

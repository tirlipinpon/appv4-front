import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Parcours professeur : « Voir comme l'enfant » sur les six formes.
 * L'API teacher est simulée. Le verdict est calculé dans l'aperçu, sans appel enfant.
 */

test.use({ viewport: { width: 1280, height: 1200 } });

const ui = {
  preview: 'teacher-question-preview',
  dialog: 'teacher-child-preview-dialog',
  submit: 'teacher-child-preview-submit',
  result: 'teacher-child-preview-result',
  replay: 'teacher-child-preview-replay',
  prompt: 'child-play-view-prompt',
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
  freeText: 'child-play-view-free-text',
} as const;

test.describe("Voir comme l'enfant", { tag: ['@teacher', '@mock'] }, () => {
  test.describe.configure({ mode: 'parallel' });

  test('QCM : Valider reste inactif tant qu aucun choix n est fait', async ({ page }) => {
    await openPreview(page, qcmQuestion());
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('QCM : la bonne réponse donne Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPreview(page, qcmQuestion());
    await page.getByTestId(`${ui.choice}-2`).click();
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('QCM : un mauvais choix affiche Pas encore', async ({ page }) => {
    await openPreview(page, qcmQuestion());
    await page.getByTestId(`${ui.choice}-1`).click();
    await submitAndExpect(page, false, '0');
  });

  test('Memory : Valider reste inactif après une seule paire', async ({ page }) => {
    await openPreview(page, memoryQuestion());
    await matchMemory(page, [1]);
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Memory : une fausse paire ne débloque pas Valider', async ({ page }) => {
    await openPreview(page, memoryQuestion());
    await page.getByTestId(`${ui.memoryCard}-1-q`).click();
    await page.getByTestId(`${ui.memoryCard}-2-a`).click();
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Memory : les deux paires donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPreview(page, memoryQuestion());
    await matchMemory(page, [1, 2]);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test("Ordre : la frise est visible et Valider l'ordre est déjà actif", async ({ page }) => {
    await openPreview(page, orderQuestion());
    await expect(page.getByTestId(`${ui.orderAxis}-1`)).toHaveText('matin');
    await expect(page.getByTestId(`${ui.orderAxis}-2`)).toHaveText('midi');
    await expect(page.getByTestId(`${ui.orderAxis}-3`)).toHaveText('soir');
    await expect(page.getByTestId(ui.submit)).toBeEnabled();
  });

  test("Ordre : le bon ordre donne Bravo et Rejouer ramène Valider l'ordre", async ({ page }) => {
    await openPreview(page, orderQuestion());
    await arrangeOrder(page, [1, 2, 3]);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Ordre : un ordre mélangé affiche Pas encore', async ({ page }) => {
    await openPreview(page, orderQuestion());
    await disorder(page, [1, 2, 3]);
    await submitAndExpect(page, false);
  });

  test("Vrai/Faux : Valider reste inactif tant qu'une affirmation n'a pas de réponse", async ({ page }) => {
    await openPreview(page, trueFalseQuestion());
    await page.getByTestId(`${ui.tf}-1-true`).click();
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Vrai/Faux : les deux bonnes réponses donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPreview(page, trueFalseQuestion());
    await page.getByTestId(`${ui.tf}-1-true`).click();
    await page.getByTestId(`${ui.tf}-2-false`).click();
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Vrai/Faux : une affirmation fausse affiche Pas encore', async ({ page }) => {
    await openPreview(page, trueFalseQuestion());
    await page.getByTestId(`${ui.tf}-1-true`).click();
    await page.getByTestId(`${ui.tf}-2-true`).click();
    await submitAndExpect(page, false, '50');
  });

  test('Classement : Valider reste inactif tant qu une carte reste à placer', async ({ page }) => {
    await openPreview(page, classementQuestion());
    await placeCards(page, [[1, 1]]);
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Classement : les bonnes colonnes donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPreview(page, classementQuestion());
    await placeCards(page, [
      [1, 1],
      [2, 2],
    ]);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Classement : les colonnes inversées affichent Pas encore', async ({ page }) => {
    await openPreview(page, classementQuestion());
    await placeCards(page, [
      [1, 2],
      [2, 1],
    ]);
    await submitAndExpect(page, false, '0');
  });

  test('Liens : Valider reste inactif tant qu un mot n est pas relié', async ({ page }) => {
    await openPreview(page, liensQuestion());
    await pairLinks(page, [[1, 1]]);
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Liens : les bonnes associations donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPreview(page, liensQuestion());
    await pairLinks(page, [
      [1, 1],
      [2, 2],
    ]);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Liens : les associations croisées affichent Pas encore', async ({ page }) => {
    await openPreview(page, liensQuestion());
    await pairLinks(page, [
      [1, 2],
      [2, 1],
    ]);
    await submitAndExpect(page, false, '0');
  });

  test('Case vide : Valider reste inactif tant qu un trou est vide', async ({ page }) => {
    await openPreview(page, gapsQuestion());
    await placeGaps(page, [[1, 0]]);
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Case vide : les bons mots donnent Bravo et Rejouer ramène Valider', async ({ page }) => {
    await openPreview(page, gapsQuestion());
    await placeGaps(page, [
      [1, 0],
      [2, 1],
    ]);
    await submitAndExpect(page, true, '100');
    await replay(page);
  });

  test('Case vide : un leurre affiche Pas encore', async ({ page }) => {
    await openPreview(page, gapsQuestion());
    await placeGaps(page, [
      [1, 0],
      [3, 1],
    ]);
    await submitAndExpect(page, false, '50');
  });

  test('Réponse libre : Valider reste inactif tant que le champ est vide', async ({ page }) => {
    await openPreview(page, freeTextQuestion());
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
    await page.getByTestId(ui.freeText).fill('   ');
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
  });

  test('Réponse libre : Pâris donne Bravo', async ({ page }) => {
    await openPreview(page, freeTextQuestion());
    await page.getByTestId(ui.freeText).fill('  Pâris  ');
    await submitAndExpect(page, true, '100');
  });

  test('Réponse libre : un espace au milieu affiche Pas encore', async ({ page }) => {
    await openPreview(page, freeTextQuestion());
    await page.getByTestId(ui.freeText).fill('Pa ris');
    await submitAndExpect(page, false, '0');
  });
});

function qcmQuestion(): SavedQuestion {
  return {
    id: 42,
    prompt: 'Lequel est un fruit ?',
    formCode: 'qcm',
    formLabel: 'QCM',
    choices: [
      { label: 'Pierre', correct: false },
      { label: 'Poire', correct: true },
    ],
  };
}

function memoryQuestion(): SavedQuestion {
  return {
    id: 42,
    prompt: 'Retrouve les paires',
    formCode: 'memory',
    formLabel: 'Memory',
    pairs: [
      { questionSide: 'chat', answerSide: 'miaou' },
      { questionSide: 'chien', answerSide: 'ouaf' },
    ],
  };
}

function orderQuestion(): SavedQuestion {
  return {
    id: 42,
    prompt: 'Remets la journée dans l ordre',
    formCode: 'order',
    formLabel: 'Ordre',
    timelineEnabled: true,
    items: [
      { label: 'lever', axisLabel: 'matin' },
      { label: 'déjeuner', axisLabel: 'midi' },
      { label: 'dîner', axisLabel: 'soir' },
    ],
  };
}

function trueFalseQuestion(): SavedQuestion {
  return {
    id: 42,
    prompt: 'Vrai ou faux ?',
    formCode: 'vrai_faux',
    formLabel: 'Vrai/Faux',
    statements: [
      { label: 'Deux et deux font quatre', truthful: true },
      { label: 'Trois et trois font sept', truthful: false },
    ],
  };
}

function classementQuestion(): SavedQuestion {
  return {
    id: 42,
    prompt: 'Range chaque carte',
    formCode: 'classement',
    formLabel: 'Classement',
    columns: [
      { id: 10, label: 'Fruit' },
      { id: 11, label: 'Légume' },
    ],
    cards: [
      { label: 'Poire', correctColumnId: 10 },
      { label: 'Carotte', correctColumnId: 11 },
    ],
  };
}

function gapsQuestion(): SavedQuestion {
  return {
    id: 42,
    prompt: 'Complète la phrase',
    formCode: 'case_vide',
    formLabel: 'Case vide',
    sentence: 'Le ___ mange une ___.',
    answers: [{ label: 'chat' }, { label: 'pomme' }],
    decoys: [{ label: 'voiture' }],
  };
}

function freeTextQuestion(): SavedQuestion {
  return {
    id: 42,
    prompt: 'Capitale de la France',
    formCode: 'texte',
    formLabel: 'Réponse libre',
    expectedAnswer: 'Paris',
  };
}

function liensQuestion(): SavedQuestion {
  return {
    id: 42,
    prompt: 'Relie chaque mot',
    formCode: 'liens',
    formLabel: 'Liens',
    links: [
      { leftLabel: 'un', rightLabel: '1' },
      { leftLabel: 'deux', rightLabel: '2' },
    ],
  };
}

interface SavedQuestion {
  id: number;
  prompt: string;
  formCode: string;
  formLabel: string;
  choices?: { label: string; correct: boolean }[];
  pairs?: { questionSide: string; answerSide: string }[];
  items?: { label: string; axisLabel: string }[];
  statements?: { label: string; truthful: boolean }[];
  columns?: { id: number; label: string }[];
  cards?: { label: string; correctColumnId: number }[];
  links?: { leftLabel: string; rightLabel: string }[];
  timelineEnabled?: boolean;
  sentence?: string;
  expectedAnswer?: string;
  answers?: { label: string }[];
  decoys?: { label: string }[];
}

async function openPreview(page: Page, question: SavedQuestion): Promise<void> {
  await page.addInitScript((token) => {
    sessionStorage.setItem('admin.jwt', token);
  }, teacherJwt());
  await page.route(
    (url) => url.pathname === '/api/int/auth/me',
    async (route) => {
      await json(route, { email: 'anne@example.com', displayName: 'Anne' });
    },
  );
  await page.route(
    (url) => url.pathname === '/api/int/auth/spaces',
    async (route) => {
      await json(route, { roles: ['teacher'], teacherRequest: 'approved' });
    },
  );
  await page.route(
    (url) => url.pathname === '/api/int/teacher/subjects',
    async (route) => {
      await json(route, {
        schools: [
          {
            schoolId: 1,
            schoolName: 'École des tilleuls',
            grades: [
              {
                grade: 'CE1',
                subjects: [{ id: 4, name: 'Maths', followedByMe: true, questionCount: 1 }],
              },
            ],
          },
        ],
      });
    },
  );
  await page.route(
    (url) => url.pathname === '/api/int/teacher/question-forms',
    async (route) => {
      await json(route, { forms: [{ code: question.formCode, label: question.formLabel }] });
    },
  );
  await page.route(
    (url) => url.pathname === '/api/int/teacher/subjects/4/questions',
    async (route) => {
      await json(route, { questions: [question], nextCursor: null });
    },
  );
  await page.goto('/teacher/questions');
  await page.getByTestId(ui.preview).click();
  await expect(page.getByTestId(ui.dialog)).toBeVisible();
  await expect(page.getByTestId(ui.prompt)).toBeVisible();
}

function teacherJwt(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = Buffer.from(JSON.stringify({ exp, activeRole: 'teacher', roles: ['teacher'] })).toString('base64url');
  return `e30.${body}.sig`;
}

async function submitAndExpect(page: Page, passed: boolean, score?: string): Promise<void> {
  await expect(page.getByTestId(ui.submit)).toBeEnabled();
  await page.getByTestId(ui.submit).click();
  const result = page.getByTestId(ui.result);
  await expect(result).toContainText(passed ? 'Bravo' : 'Pas encore');
  if (score != null) {
    await expect(result).toContainText(score);
  } else {
    await expect(result).not.toContainText('100');
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

async function pairLinks(page: Page, pairs: readonly (readonly [number, number])[]): Promise<void> {
  for (const [leftId, rightId] of pairs) {
    await page.getByTestId(`${ui.linkLeft}-l-${leftId}`).click();
    await page.getByTestId(`${ui.linkRight}-r-${rightId}`).click();
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

import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Workflows matières professeur : partage, déplacement, invites, retrait
 * (dernier détenteur vs partagée). APIs mockées — pas besoin du back.
 */

type Mode = 'move' | 'share' | 'ask' | 'handover';

const ui = {
  intro: 'teacher-subjects-intro',
  transfer: 'teacher-subject-transfer',
  share: 'teacher-subject-share',
  move: 'teacher-subject-move',
  colleague: 'teacher-subject-colleague',
  continue: 'teacher-subject-continue',
  send: 'teacher-subject-send',
  transferConfirm: 'teacher-subject-transfer-confirm',
  invite: 'teacher-invite',
  accept: 'teacher-invite-accept',
  reject: 'teacher-invite-reject',
  name: 'teacher-subject-name',
  add: 'teacher-subject-add',
  gradeError: 'teacher-subject-grade-error',
  askShare: 'teacher-subject-ask-share',
  shareSent: 'teacher-subject-share-sent',
  shared: 'teacher-subject-shared',
  remove: 'teacher-subject-remove',
  removeConfirm: 'teacher-subject-remove-confirm',
  confirmRemove: 'teacher-subject-confirm-remove',
  moveInstead: 'teacher-subject-move-instead',
  noColleague: 'teacher-subject-no-colleague',
  handover: 'teacher-subject-handover',
  handoverSend: 'teacher-subject-handover-send',
} as const;

interface SharedHolder {
  userId: number;
  displayName: string;
}

interface SubjectState {
  id: number;
  name: string;
  active: boolean;
  ownedByMe: boolean;
  sharedWith: SharedHolder[];
}

interface InviteState {
  id: number;
  subjectId: number;
  subjectName: string;
  schoolId: number;
  schoolName: string;
  grade: string;
  mode: Mode;
  fromDisplayName: string;
}

test('partage : demande envoyée puis acceptée par le collègue', async ({ page }) => {
  const state = createState();
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByTestId(ui.transfer).first().click();
  await page.getByTestId(ui.share).click();
  await colleague(page, 'Camille').click();
  await page.getByTestId(ui.continue).click();
  await expect(page.getByTestId(ui.transferConfirm)).toHaveAttribute('data-transfer-mode', 'share');
  await expect(page.getByTestId(ui.transferConfirm)).toContainText('Lecture');
  await expect(page.getByTestId(ui.transferConfirm)).toContainText('Camille');
  await page.getByTestId(ui.send).click();
  await expect(page.getByTestId(ui.transfer).first()).toBeVisible();
  expect(state.pendingTransfers).toHaveLength(1);
  expect(state.pendingTransfers[0].mode).toBe('share');

  state.invites = [
    {
      id: 1,
      subjectId: 2,
      subjectName: 'Lecture',
      schoolId: 1,
      schoolName: 'École Nouvelle',
      grade: '3e primaire',
      mode: 'share',
      fromDisplayName: 'Anne',
    },
  ];
  await page.reload();
  const invite = page.getByTestId(ui.invite);
  await expect(invite).toHaveAttribute('data-invite-mode', 'share');
  await expect(invite).toContainText('Anne');
  await expect(invite).toContainText('Lecture');
  await page.getByTestId(ui.accept).click();
  await expect(page.getByTestId(ui.invite)).toHaveCount(0);
  expect(state.subjects[0].sharedWith).toEqual([{ userId: 1, displayName: 'Anne' }]);
});

test('nom déjà pris : le professeur demande au créateur de partager', async ({ page }) => {
  const state = createState();
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByTestId(ui.name).fill('Calcul');
  await page.getByTestId(ui.add).click();
  await expect(page.getByTestId(ui.gradeError)).toHaveAttribute('data-error-code', 'SUBJECT_SHARE_AVAILABLE');
  await expect(page.getByTestId(ui.gradeError)).toContainText('Anne');
  await page.getByTestId(ui.askShare).click();
  await expect(page.getByTestId(ui.shareSent)).toBeVisible();
  expect(state.shareRequests).toEqual([{ schoolId: 1, grade: '3e primaire', name: 'Calcul' }]);

  state.invites = [
    {
      id: 4,
      subjectId: 9,
      subjectName: 'Calcul',
      schoolId: 1,
      schoolName: 'École Nouvelle',
      grade: '3e primaire',
      mode: 'ask',
      fromDisplayName: 'Camille',
    },
  ];
  await page.reload();
  const ask = page.getByTestId(ui.invite);
  await expect(ask).toHaveAttribute('data-invite-mode', 'ask');
  await expect(ask).toContainText('Camille');
  await expect(ask).toContainText('Calcul');
  await page.getByTestId(ui.accept).click();
  await expect(page.getByTestId(ui.shared)).toContainText('Camille');
});

test('déplacement : demande envoyée puis acceptée par le destinataire', async ({ page }) => {
  const state = createState();
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByTestId(ui.transfer).first().click();
  await page.getByTestId(ui.move).click();
  await colleague(page, 'Camille').click();
  await page.getByTestId(ui.continue).click();
  await expect(page.getByTestId(ui.transferConfirm)).toHaveAttribute('data-transfer-mode', 'move');
  await expect(page.getByTestId(ui.transferConfirm)).toContainText('Lecture');
  await page.getByTestId(ui.send).click();

  state.invites = [
    {
      id: 2,
      subjectId: 2,
      subjectName: 'Lecture',
      schoolId: 1,
      schoolName: 'École Nouvelle',
      grade: '3e primaire',
      mode: 'move',
      fromDisplayName: 'Anne',
    },
  ];
  await page.reload();
  await page.getByTestId(ui.accept).click();
  await expect(page.getByTestId(ui.invite)).toHaveCount(0);
  // Destinataire : la matière reste, sans co-prof (seul accès après move).
  await expect(page.getByText('Lecture', { exact: true })).toBeVisible();
  await expect(page.getByTestId(ui.shared)).toHaveCount(0);
  expect(state.subjects.find((s) => s.id === 2)?.sharedWith).toEqual([]);
  expect(state.subjects.find((s) => s.id === 2)?.ownedByMe).toBe(true);
});

test('invite refusée : la matière ne change pas', async ({ page }) => {
  const state = createState();
  state.invites = [
    {
      id: 3,
      subjectId: 2,
      subjectName: 'Lecture',
      schoolId: 1,
      schoolName: 'École Nouvelle',
      grade: '3e primaire',
      mode: 'share',
      fromDisplayName: 'Anne',
    },
  ];
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByTestId(ui.reject).click();
  await expect(page.getByTestId(ui.invite)).toHaveCount(0);
  await expect(page.getByText('Lecture')).toBeVisible();
  expect(state.subjects[0].sharedWith).toEqual([]);
});

test('retrait partagé : le collègue garde la matière', async ({ page }) => {
  const state = createState({
    subjects: [
      {
        id: 3,
        name: 'Mathématiques',
        active: true,
        ownedByMe: true,
        sharedWith: [{ userId: 10, displayName: 'Camille' }],
      },
    ],
  });
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByTestId(ui.remove).click();
  const sharedConfirm = page.getByTestId(ui.removeConfirm);
  await expect(sharedConfirm).toHaveAttribute('data-remove-kind', 'shared');
  await expect(sharedConfirm).toContainText('Mathématiques');
  await expect(page.getByTestId(ui.moveInstead)).toHaveCount(0);
  await expect(page.getByTestId(ui.confirmRemove)).toHaveCount(0);
  await page.getByTestId(ui.handover).filter({ hasText: 'Camille' }).click();
  await post(page, ui.handoverSend, '/transfer');
  expect(state.pendingTransfers[0]).toMatchObject({ mode: 'handover', colleagueUserId: 10 });
  await expect(page.getByText('Mathématiques')).toBeVisible();
});

test('retrait dernier détenteur avec collègues : proposer déplacer ou confirmer', async ({ page }) => {
  const state = createState();
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByTestId(ui.remove).first().click();
  await expect(page.getByTestId(ui.removeConfirm)).toHaveAttribute('data-remove-kind', 'sole');
  await expect(page.getByTestId(ui.moveInstead)).toBeVisible();

  await page.getByTestId(ui.moveInstead).click();
  await expect(page.getByTestId(ui.move)).toHaveClass(/selected/);
  await expect(colleague(page, 'Camille')).toBeVisible();
  await colleague(page, 'Camille').click();
  await page.getByTestId(ui.continue).click();
  await post(page, ui.send, '/transfer');
  expect(state.pendingTransfers[0]).toMatchObject({ mode: 'move', colleagueUserId: 10 });
  await expect(page.getByText('Lecture')).toBeVisible();
});

test('retrait dernier détenteur : confirmer le retrait cache la matière', async ({ page }) => {
  const state = createState();
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByTestId(ui.remove).first().click();
  await page.getByTestId(ui.confirmRemove).click();
  await expect(page.getByText('Lecture')).toHaveCount(0);
  expect(state.subjects.find((s) => s.id === 2)).toBeUndefined();
});

test('retrait dernier détenteur sans collègue : pas de bouton déplacer', async ({ page }) => {
  const state = createState({ colleagues: [] });
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByTestId(ui.remove).first().click();
  await expect(page.getByTestId(ui.removeConfirm)).toHaveAttribute('data-remove-kind', 'sole');
  await expect(page.getByTestId(ui.noColleague)).toBeVisible();
  await expect(page.getByTestId(ui.moveInstead)).toHaveCount(0);
  await page.getByTestId(ui.confirmRemove).click();
  await expect(page.getByText('Lecture')).toHaveCount(0);
});

test('transfert sans collègue : message Aucun collègue', async ({ page }) => {
  const state = createState({ colleagues: [] });
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByTestId(ui.transfer).first().click();
  await expect(page.getByTestId(ui.noColleague)).toBeVisible();
  await expect(page.getByTestId(ui.continue)).toBeDisabled();
});

interface MockState {
  subjects: SubjectState[];
  colleagues: { userId: number; displayName: string }[];
  invites: InviteState[];
  pendingTransfers: { subjectId: number; colleagueUserId: number; mode: Mode }[];
  shareRequests: { schoolId: number; grade: string; name: string }[];
  nextInviteId: number;
}

function createState(partial?: {
  subjects?: SubjectState[];
  colleagues?: { userId: number; displayName: string }[];
}): MockState {
  return {
    subjects: partial?.subjects ?? [
      { id: 2, name: 'Lecture', active: true, ownedByMe: true, sharedWith: [] },
    ],
    colleagues:
      partial?.colleagues !== undefined
        ? partial.colleagues
        : [{ userId: 10, displayName: 'Camille' }],
    invites: [],
    pendingTransfers: [],
    shareRequests: [],
    nextInviteId: 1,
  };
}

async function openMatieres(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    sessionStorage.setItem('admin.jwt', token);
  }, teacherJwt());
  await page.goto('/teacher/matieres');
  await expect(page.getByTestId(ui.intro)).toBeVisible();
}

function colleague(page: Page, name: string) {
  return page.getByTestId(ui.colleague).filter({ hasText: name });
}

async function post(page: Page, testId: string, urlPart: string): Promise<void> {
  const done = page.waitForResponse(
    (response) => response.url().includes(urlPart) && response.request().method() === 'POST',
  );
  await page.getByTestId(testId).click();
  await done;
}

async function mockTeacherApis(page: Page, state: MockState): Promise<void> {
  await page.route('**/api/int/auth/spaces', async (route) => {
    await json(route, { roles: ['teacher'], teacherRequest: 'approved' });
  });

  await page.route('**/api/int/auth/me', async (route) => {
    await json(route, { email: 'anne@example.com', displayName: 'Anne' });
  });

  await page.route('**/api/int/teacher/subjects/transfer-invites/**', async (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/');
    const action = parts[parts.length - 1];
    const inviteId = Number(parts[parts.length - 2]);
    const invite = state.invites.find((row) => row.id === inviteId);
    if (!invite) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      return;
    }
    if (action === 'accept') {
      applyAccept(state, invite);
    }
    state.invites = state.invites.filter((row) => row.id !== inviteId);
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/api/int/teacher/subjects/transfer-invites', async (route) => {
    await json(route, { invites: state.invites });
  });

  await page.route('**/api/int/teacher/subjects/deactivate-notices/**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/api/int/teacher/subjects/deactivate-notices', async (route) => {
    await json(route, { notices: [] });
  });

  await page.route(/\/api\/int\/teacher\/subjects\/\d+\/colleagues$/, async (route) => {
    await json(route, { colleagues: state.colleagues });
  });

  await page.route(/\/api\/int\/teacher\/subjects\/\d+\/followers$/, async (route) => {
    await json(route, { childCount: 0, warning: 'Aucun enfant ne suit ce cours.', names: [] });
  });

  await page.route(/\/api\/int\/teacher\/subjects\/\d+\/transfer$/, async (route) => {
    const subjectId = Number(route.request().url().split('/subjects/')[1].split('/')[0]);
    const body = route.request().postDataJSON() as {
      colleagueUserId: number;
      mode: Mode;
    };
    state.pendingTransfers.push({
      subjectId,
      colleagueUserId: body.colleagueUserId,
      mode: body.mode,
    });
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route(/\/api\/int\/teacher\/subjects\/\d+$/, async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }
    const subjectId = Number(route.request().url().split('/subjects/')[1]);
    state.subjects = state.subjects.filter((row) => row.id !== subjectId);
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/api/int/teacher/subjects', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Une matière de ce nom existe déjà. Tu peux demander à Anne de la partager.',
          code: 'SUBJECT_SHARE_AVAILABLE',
        }),
      });
      return;
    }
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, {
      schools: [
        {
          schoolId: 1,
          schoolName: 'École Nouvelle',
          grades: [{ grade: '3e primaire', subjects: state.subjects }],
        },
      ],
    });
  });

  await page.route('**/api/int/teacher/subjects/share-requests', async (route) => {
    state.shareRequests.push(
      route.request().postDataJSON() as { schoolId: number; grade: string; name: string },
    );
    await route.fulfill({ status: 204, body: '' });
  });
}

function applyAccept(state: MockState, invite: InviteState): void {
  const subject = state.subjects.find((row) => row.id === invite.subjectId);
  const fromHolder: SharedHolder = { userId: 1, displayName: invite.fromDisplayName };
  if (!subject) {
    // Move/share reçu alors que la matière n'était pas encore dans la liste locale.
    state.subjects.push({
      id: invite.subjectId,
      name: invite.subjectName,
      active: true,
      ownedByMe: invite.mode !== 'share',
      sharedWith: invite.mode === 'move' ? [] : [fromHolder],
    });
    return;
  }
  if (invite.mode === 'share' || invite.mode === 'ask') {
    if (!subject.sharedWith.some((row) => row.displayName === invite.fromDisplayName)) {
      subject.sharedWith = [...subject.sharedWith, fromHolder];
    }
    return;
  }
  // Move accepté : le destinataire est seul dessus.
  subject.sharedWith = [];
  subject.ownedByMe = true;
}

async function json(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function teacherJwt(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = Buffer.from(
    JSON.stringify({ exp, activeRole: 'teacher', roles: ['teacher'] }),
  ).toString('base64url');
  return `e30.${body}.sig`;
}

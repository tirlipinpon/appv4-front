import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Workflows matières professeur : partage, déplacement, invites, retrait
 * (dernier détenteur vs partagée). APIs mockées — pas besoin du back.
 */

type Mode = 'move' | 'share' | 'ask';

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
  await page.getByRole('button', { name: 'Transférer' }).first().click();
  await page.getByRole('button', { name: 'Partager' }).click();
  await page.getByRole('button', { name: 'Camille' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText(/Proposer de partager Lecture/)).toBeVisible();
  await page.getByRole('button', { name: 'Envoyer la demande' }).click();
  await expect(page.getByRole('button', { name: 'Transférer' }).first()).toBeVisible();
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
  await expect(page.getByText('Anne propose de partager Lecture')).toBeVisible();
  await page.getByRole('button', { name: 'Accepter' }).click();
  await expect(page.getByText('Demandes reçues')).toHaveCount(0);
  expect(state.subjects[0].sharedWith).toEqual([{ userId: 1, displayName: 'Anne' }]);
});

test('nom déjà pris : le professeur demande au créateur de partager', async ({ page }) => {
  const state = createState();
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByLabel('Nouvelle matière').fill('Calcul');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Tu peux demander à Anne de la partager.')).toBeVisible();
  await page.getByRole('button', { name: 'Demander le partage' }).click();
  await expect(page.getByText('Demande envoyée.')).toBeVisible();
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
  await expect(
    page.getByText(
      'Camille demande à voir aussi Calcul (École Nouvelle, 3e primaire). Si tu acceptes, vous la partagerez.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Accepter' }).click();
  await expect(page.getByText('Partagée avec Camille')).toBeVisible();
});

test('déplacement : demande envoyée puis acceptée par le destinataire', async ({ page }) => {
  const state = createState();
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByRole('button', { name: 'Transférer' }).first().click();
  await page.getByRole('button', { name: 'Déplacer', exact: true }).click();
  await page.getByRole('button', { name: 'Camille' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText(/Proposer de déplacer Lecture/)).toBeVisible();
  await page.getByRole('button', { name: 'Envoyer la demande' }).click();

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
  await page.getByRole('button', { name: 'Accepter' }).click();
  await expect(page.getByText('Demandes reçues')).toHaveCount(0);
  // Destinataire : la matière reste, sans co-prof (seul accès après move).
  await expect(page.getByText('Lecture', { exact: true })).toBeVisible();
  await expect(page.getByText(/Partagée avec/)).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Refuser' }).click();
  await expect(page.getByText('Demandes reçues')).toHaveCount(0);
  await expect(page.getByText('Lecture')).toBeVisible();
  expect(state.subjects[0].sharedWith).toEqual([]);
});

test('transfert sans collègue : message Aucun collègue', async ({ page }) => {
  const state = createState({ colleagues: [] });
  await mockTeacherApis(page, state);

  await openMatieres(page);
  await page.getByRole('button', { name: 'Transférer' }).first().click();
  await expect(page.getByText('Aucun collègue avec cette classe.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeDisabled();
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
  await expect(page.getByText('Un nom par classe')).toBeVisible();
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

  await page.route('**/api/int/teacher/subjects', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Une matière de ce nom existe déjà. Tu peux demander à Anne de la partager.',
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

import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Workflows matières professeur : partage, déplacement, invites, retrait
 * (dernier détenteur vs partagée). APIs mockées — pas besoin du back.
 */

const ui = {
  subtitle: 'subjects-subtitle',
  inboxTitle: 'subjects-inbox-title',
  inviteText: 'subject-invite-text',
  inviteAccept: 'subject-invite-accept',
  inviteReject: 'subject-invite-reject',
  noticeText: 'subject-notice-text',
  noticeOk: 'subject-notice-ok',
  name: 'subject-name',
  questions: 'subject-question-count',
  shared: 'subject-shared',
  followedBy: 'subject-followed-by',
  remove: 'subject-remove',
  transfer: 'subject-transfer',
  rename: 'subject-rename',
  confirmRemove: 'subject-confirm-remove',
  handover: 'subject-handover',
  moveInstead: 'subject-move-instead',
  modeMove: 'subject-mode-move',
  modeShare: 'subject-mode-share',
  continue: 'subject-transfer-continue',
  send: 'subject-transfer-send',
  noColleague: 'subject-no-colleague',
  confirm: 'subject-confirm',
  transferConfirm: 'subject-transfer-confirm',
  error: 'subject-error',
  gradeError: 'subject-grade-error',
  askShare: 'subject-ask-share',
  shareSent: 'subject-share-sent',
  newName: 'subject-new-name',
  add: 'subject-add',
  reuse: 'subject-reuse',
  colleagueRefused: 'subject-colleague-refused',
  colleagueList: 'subject-colleague-list',
} as const;

function subjectCard(page: Page, id: number) {
  return page.getByTestId(`subject-${id}`);
}

function colleagueButton(page: Page, subjectId: number, userId: number) {
  return subjectCard(page, subjectId).getByTestId(`subject-colleague-${userId}`);
}

type Mode = 'move' | 'share' | 'ask' | 'handover';

interface SharedHolder {
  userId: number;
  displayName: string;
  /** Vide : on peut encore lui demander. Sinon, nom de l'action déjà refusée. */
  refusedAction?: string;
}

interface SubjectState {
  id: number;
  name: string;
  active: boolean;
  ownedByMe: boolean;
  /** Absent du mock : le professeur suit la matière. */
  followedByMe?: boolean;
  sharedWith: SharedHolder[];
  questionCount?: number;
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

test.describe("Retirer", () => {
  test('Anne est la seule sur Lecture. Elle confirme le retrait : Lecture disparaît de sa liste.', async ({ page }) => {
    const state = createState();
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.remove).click();
    await subjectCard(page, 2).getByTestId(ui.confirmRemove).click();
    await expect(subjectCard(page, 2)).toHaveCount(0);
    expect(state.subjects.find((s) => s.id === 2)).toBeUndefined();
  });

  test("Anne est la seule sur Lecture et aucun collègue n'a cette classe. Elle ne peut que confirmer le retrait.", async ({ page }) => {
    const state = createState({ colleagues: [] });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.remove).click();
    await expect(subjectCard(page, 2).getByTestId(ui.confirm)).toContainText('Lecture');
    await expect(subjectCard(page, 2).getByTestId(ui.noColleague)).toBeVisible();
    await expect(subjectCard(page, 2).getByTestId(ui.moveInstead)).toHaveCount(0);
    await subjectCard(page, 2).getByTestId(ui.confirmRemove).click();
    await expect(subjectCard(page, 2)).toHaveCount(0);
  });

  test('Anne suit Mathématiques sans en être la propriétaire. Elle la retire de sa liste : Camille la garde, et Anne ne peut pas la déplacer.', async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 3,
          name: 'Mathématiques',
          active: true,
          ownedByMe: false,
          followedByMe: true,
          sharedWith: [{ userId: 10, displayName: 'Camille' }],
        },
      ],
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 3).getByTestId(ui.remove).click();
    await expect(subjectCard(page, 3).getByTestId(ui.confirm)).toContainText('Camille');
    await expect(subjectCard(page, 3).getByTestId(ui.moveInstead)).toHaveCount(0);
    await expect(subjectCard(page, 3).getByTestId(ui.handover)).toHaveCount(0);
    await subjectCard(page, 3).getByTestId(ui.confirmRemove).click();
    await expect(subjectCard(page, 3).getByTestId(ui.followedBy)).toContainText('Camille');
    await expect(subjectCard(page, 3).getByTestId(ui.remove)).toHaveCount(0);
    expect(state.subjects[0].followedByMe).toBe(false);
  });

  test("Anne suit Lecture seule, mais elle n'en est pas la propriétaire. Elle peut la retirer de sa liste, pas la déplacer vers un collègue.", async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 2,
          name: 'Lecture',
          active: true,
          ownedByMe: false,
          followedByMe: true,
          sharedWith: [],
        },
      ],
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.remove).click();
    await expect(subjectCard(page, 2).getByTestId(ui.confirm)).toContainText('Lecture');
    await expect(subjectCard(page, 2).getByTestId(ui.moveInstead)).toHaveCount(0);
    await expect(subjectCard(page, 2).getByTestId(ui.confirmRemove)).toBeVisible();
  });

  test("On ne sait pas quels enfants suivent Lecture. Le retrait s'arrête, et la matière reste.", async ({ page }) => {
    const state = createState();
    state.followersFail = true;
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.remove).click();
    await expect(subjectCard(page, 2).getByTestId(ui.error)).toHaveText('Impossible de savoir qui suit ce cours.');
    await expect(subjectCard(page, 2).getByTestId(ui.confirmRemove)).toHaveCount(0);
    await expect(subjectCard(page, 2).getByTestId(ui.name)).toHaveText('Lecture');
  });
});

test.describe("Reprendre", () => {
  test('Anne veut retirer Mathématiques alors que Camille la suit déjà. Elle ne peut pas la retirer : elle doit demander à Camille de la reprendre.', async ({ page }) => {
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
    await subjectCard(page, 3).getByTestId(ui.remove).click();
    await expect(subjectCard(page, 3).getByTestId(ui.confirm)).toContainText('Mathématiques');
    await expect(subjectCard(page, 3).getByTestId(ui.moveInstead)).toHaveCount(0);
    await expect(subjectCard(page, 3).getByTestId(ui.confirmRemove)).toHaveCount(0);
    await colleagueButton(page, 3, 10).click();
    const sent = page.waitForResponse(
      (response) => response.url().includes('/transfer') && response.request().method() === 'POST',
    );
    await subjectCard(page, 3).getByTestId(ui.handover).click();
    await sent;
    expect(state.pendingTransfers[0]).toMatchObject({ mode: 'handover', colleagueUserId: 10 });
    await expect(subjectCard(page, 3).getByTestId(ui.name)).toHaveText('Mathématiques');
  });

  test('Camille a déjà refusé de reprendre Mathématiques. Anne voit son nom grisé et ne peut plus la choisir.', async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 3,
          name: 'Mathématiques',
          active: true,
          ownedByMe: true,
          sharedWith: [
            { userId: 10, displayName: 'Camille', refusedAction: 'Demander la reprise' },
            { userId: 11, displayName: 'Luc', refusedAction: '' },
          ],
        },
      ],
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 3).getByTestId(ui.remove).click();
    await expect(colleagueButton(page, 3, 10).getByTestId(ui.colleagueRefused)).toContainText('Demander la reprise');
    await expect(colleagueButton(page, 3, 10)).toBeDisabled();
    await expect(colleagueButton(page, 3, 11)).toBeEnabled();
    await colleagueButton(page, 3, 10).click({ force: true });
    await expect(subjectCard(page, 3).getByTestId(ui.handover)).toBeDisabled();
    await colleagueButton(page, 3, 11).click();
    await expect(subjectCard(page, 3).getByTestId(ui.handover)).toBeEnabled();
  });

  test('Camille et Luc ont déjà refusé de reprendre Mathématiques. Anne ne peut plus envoyer de demande, et la matière reste.', async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 3,
          name: 'Mathématiques',
          active: true,
          ownedByMe: true,
          sharedWith: [
            { userId: 10, displayName: 'Camille', refusedAction: 'Demander la reprise' },
            { userId: 11, displayName: 'Luc', refusedAction: 'Demander la reprise' },
          ],
        },
      ],
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 3).getByTestId(ui.remove).click();
    await expect(colleagueButton(page, 3, 10)).toBeDisabled();
    await expect(colleagueButton(page, 3, 11)).toBeDisabled();
    await expect(subjectCard(page, 3).getByTestId(ui.handover)).toBeDisabled();
    await expect(subjectCard(page, 3).getByTestId(ui.confirm)).toContainText('Mathématiques');
    expect(state.subjects.map((row) => row.name)).toEqual(['Mathématiques']);
  });

  test('Camille demande à Anne de reprendre Mathématiques. Anne accepte : elle en devient propriétaire, et Camille quitte la liste.', async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 3,
          name: 'Mathématiques',
          active: true,
          ownedByMe: false,
          followedByMe: true,
          sharedWith: [
            { userId: 1, displayName: 'Camille' },
            { userId: 11, displayName: 'Luc' },
          ],
        },
      ],
    });
    state.invites = [
      {
        id: 8,
        subjectId: 3,
        subjectName: 'Mathématiques',
        schoolId: 1,
        schoolName: 'École Nouvelle',
        grade: '3e primaire',
        mode: 'handover',
        fromDisplayName: 'Camille',
      },
    ];
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await expect(page.getByTestId(ui.inviteText)).toContainText('Camille');
    await expect(page.getByTestId(ui.inviteText)).toContainText('Mathématiques');
    await page.getByTestId(ui.inviteAccept).click();
    await expect(page.getByTestId(ui.inboxTitle)).toHaveCount(0);
    await expect(subjectCard(page, 3).getByTestId(ui.shared)).toContainText('Luc');
    await expect(subjectCard(page, 3).getByTestId(ui.shared)).not.toContainText('Camille');
    await expect(subjectCard(page, 3).getByTestId(ui.rename)).toBeVisible();
    expect(state.subjects[0].ownedByMe).toBe(true);
    expect(state.subjects[0].sharedWith.map((row) => row.displayName)).toEqual(['Luc']);
  });

  test('Anne refuse de reprendre Mathématiques, mais Luc la suit encore. La matière reste visible.', async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 3,
          name: 'Mathématiques',
          active: true,
          ownedByMe: false,
          followedByMe: true,
          sharedWith: [{ userId: 11, displayName: 'Luc' }],
        },
      ],
    });
    state.invites = [
      {
        id: 9,
        subjectId: 3,
        subjectName: 'Mathématiques',
        schoolId: 1,
        schoolName: 'École Nouvelle',
        grade: '3e primaire',
        mode: 'handover',
        fromDisplayName: 'Luc',
      },
    ];
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await page.getByTestId(ui.inviteReject).click();
    await expect(page.getByTestId(ui.inviteText)).toHaveCount(0);
    await expect(subjectCard(page, 3).getByTestId(ui.name)).toHaveText('Mathématiques');
  });

  test('Anne est la dernière à pouvoir reprendre Mathématiques et elle refuse. La matière disparaît pour tout le monde.', async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 3,
          name: 'Mathématiques',
          active: true,
          ownedByMe: false,
          followedByMe: true,
          sharedWith: [{ userId: 1, displayName: 'Camille' }],
        },
      ],
    });
    state.removeSubjectWhenHandoverRefused = true;
    state.invites = [
      {
        id: 10,
        subjectId: 3,
        subjectName: 'Mathématiques',
        schoolId: 1,
        schoolName: 'École Nouvelle',
        grade: '3e primaire',
        mode: 'handover',
        fromDisplayName: 'Camille',
      },
    ];
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await page.getByTestId(ui.inviteReject).click();
    await expect(subjectCard(page, 3)).toHaveCount(0);
  });

  test("Mathématiques a été retirée de toutes les listes, puis Anne la reprend. Camille n'est plus marquée comme ayant déjà refusé : Anne peut lui redemander de la reprendre.", async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 3,
          name: 'Mathématiques',
          active: true,
          ownedByMe: true,
          sharedWith: [
            { userId: 10, displayName: 'Camille', refusedAction: '' },
          ],
        },
      ],
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 3).getByTestId(ui.remove).click();
    await expect(page.getByTestId(ui.colleagueRefused)).toHaveCount(0);
    await colleagueButton(page, 3, 10).click();
    await expect(subjectCard(page, 3).getByTestId(ui.handover)).toBeEnabled();
  });
});

test.describe("Déplacer", () => {
  test('Anne est seule sur Lecture et la déplace vers Camille. Camille accepte : elle en devient la seule propriétaire.', async ({ page }) => {
    const state = createState();
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.transfer).click();
    await subjectCard(page, 2).getByTestId(ui.modeMove).click();
    await colleagueButton(page, 2, 10).click();
    await subjectCard(page, 2).getByTestId(ui.continue).click();
    await expect(subjectCard(page, 2).getByTestId(ui.transferConfirm)).toContainText('Lecture');
    await expect(subjectCard(page, 2).getByTestId(ui.transferConfirm)).toContainText('Camille');
    await subjectCard(page, 2).getByTestId(ui.send).click();
  
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
    await page.getByTestId(ui.inviteAccept).click();
    await expect(page.getByTestId(ui.inboxTitle)).toHaveCount(0);
    // Destinataire : la matière reste, sans co-prof (seul accès après move).
    await expect(subjectCard(page, 2).getByTestId(ui.name)).toHaveText('Lecture');
    await expect(page.getByTestId(ui.shared)).toHaveCount(0);
    expect(state.subjects.find((s) => s.id === 2)?.sharedWith).toEqual([]);
    expect(state.subjects.find((s) => s.id === 2)?.ownedByMe).toBe(true);
  });

  test('Anne est la seule sur Lecture. Au lieu de la retirer, elle propose de la déplacer vers Camille.', async ({ page }) => {
    const state = createState();
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.remove).click();
    await expect(subjectCard(page, 2).getByTestId(ui.confirm)).toContainText('Lecture');
    await expect(subjectCard(page, 2).getByTestId(ui.moveInstead)).toBeVisible();

    await subjectCard(page, 2).getByTestId(ui.moveInstead).click();
    await expect(subjectCard(page, 2).getByTestId(ui.modeShare)).toHaveCount(0);
    await expect(colleagueButton(page, 2, 10)).toContainText('Camille');
    await colleagueButton(page, 2, 10).click();
    await subjectCard(page, 2).getByTestId(ui.continue).click();
    const sent = page.waitForResponse(
      (response) => response.url().includes('/transfer') && response.request().method() === 'POST',
    );
    await subjectCard(page, 2).getByTestId(ui.send).click();
    await sent;
    expect(state.pendingTransfers[0]).toMatchObject({ mode: 'move', colleagueUserId: 10 });
    await expect(subjectCard(page, 2).getByTestId(ui.name)).toHaveText('Lecture');
  });

  test("Anne veut transférer Lecture, mais aucun collègue n'a cette classe. Le bouton Continuer reste grisé.", async ({ page }) => {
    const state = createState({ colleagues: [] });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.transfer).click();
    await expect(subjectCard(page, 2).getByTestId(ui.noColleague)).toBeVisible();
    await expect(subjectCard(page, 2).getByTestId(ui.continue)).toBeDisabled();
  });

  test('Anne est propriétaire : Transférer lui propose Déplacer et Partager.', async ({ page }) => {
    const state = createState();
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.transfer).click();
    await expect(subjectCard(page, 2).getByTestId(ui.modeMove)).toBeVisible();
    await expect(subjectCard(page, 2).getByTestId(ui.modeShare)).toBeVisible();
  });

  test("Anne déplace Lecture. À côté de chaque collègue, elle voit s'il a déjà la matière ou pas.", async ({ page }) => {
    const state = createState({
      colleagues: [
        {
          userId: 10,
          displayName: 'Camille',
          alreadyFollows: true,
          listLabel: 'la possède déjà',
        },
        {
          userId: 11,
          displayName: 'Luc',
          alreadyFollows: false,
          listLabel: 'pas encore dans sa liste',
        },
      ],
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.transfer).click();
    await subjectCard(page, 2).getByTestId(ui.modeMove).click();
    await expect(colleagueButton(page, 2, 10).getByTestId(ui.colleagueList)).toHaveText('la possède déjà');
    await expect(colleagueButton(page, 2, 11).getByTestId(ui.colleagueList)).toHaveText('pas encore dans sa liste');
    await colleagueButton(page, 2, 10).click();
    await subjectCard(page, 2).getByTestId(ui.continue).click();
    await expect(subjectCard(page, 2).getByTestId(ui.transferConfirm)).toContainText('Lecture');
  });

  test("Camille a déjà refusé le déplacement de Lecture. Son bouton est grisé. Luc, qui n'a pas refusé, reste choisissable.", async ({ page }) => {
    const state = createState({
      colleagues: [
        {
          userId: 10,
          displayName: 'Camille',
          alreadyFollows: false,
          listLabel: 'pas encore dans sa liste',
          refusedAction: 'Déplacer',
        },
        {
          userId: 11,
          displayName: 'Luc',
          alreadyFollows: false,
          listLabel: 'pas encore dans sa liste',
          refusedAction: '',
        },
      ],
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.transfer).click();
    await subjectCard(page, 2).getByTestId(ui.modeMove).click();
    await expect(colleagueButton(page, 2, 10).getByTestId(ui.colleagueRefused)).toContainText('Déplacer');
    await expect(colleagueButton(page, 2, 10)).toBeDisabled();
    await expect(colleagueButton(page, 2, 11)).toBeEnabled();
    await colleagueButton(page, 2, 11).click();
    await subjectCard(page, 2).getByTestId(ui.continue).click();
    await subjectCard(page, 2).getByTestId(ui.send).click();
    expect(state.pendingTransfers[0]).toMatchObject({ mode: 'move', colleagueUserId: 11 });
  });

  test("Camille déplace Lecture vers Anne alors que Luc l'a déjà. Anne accepte : elle devient propriétaire, Camille part, Luc la garde.", async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 2,
          name: 'Lecture',
          active: true,
          ownedByMe: false,
          followedByMe: true,
          sharedWith: [
            { userId: 1, displayName: 'Camille' },
            { userId: 11, displayName: 'Luc' },
          ],
        },
      ],
    });
    state.invites = [
      {
        id: 12,
        subjectId: 2,
        subjectName: 'Lecture',
        schoolId: 1,
        schoolName: 'École Nouvelle',
        grade: '3e primaire',
        mode: 'move',
        fromDisplayName: 'Camille',
      },
    ];
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await expect(page.getByTestId(ui.inviteText)).toContainText('Camille');
    await expect(page.getByTestId(ui.inviteText)).toContainText('Lecture');
    await page.getByTestId(ui.inviteAccept).click();
    await expect(subjectCard(page, 2).getByTestId(ui.rename)).toBeVisible();
    await expect(subjectCard(page, 2).getByTestId(ui.shared)).toContainText('Luc');
    await expect(subjectCard(page, 2).getByTestId(ui.shared)).not.toContainText('Camille');
    expect(state.subjects[0].ownedByMe).toBe(true);
    expect(state.subjects[0].sharedWith.map((row) => row.displayName)).toEqual(['Luc']);
  });

  test('Camille refuse le déplacement de Lecture. Anne garde la matière et lit le refus.', async ({ page }) => {
    const state = createState();
    state.notices = [
      { id: 1, message: 'Camille a refusé le déplacement de Lecture.' },
    ];
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await expect(page.getByTestId(ui.inboxTitle)).toBeVisible();
    await expect(page.getByTestId('subject-notice-1').getByTestId(ui.noticeText)).toHaveText(
      'Camille a refusé le déplacement de Lecture.',
    );
    await expect(subjectCard(page, 2).getByTestId(ui.name)).toHaveText('Lecture');
    await page.getByTestId(ui.noticeOk).click();
    await expect(page.getByTestId('subject-notice-1')).toHaveCount(0);
  });
});

test.describe("Partager", () => {
  test('Anne propose de partager Lecture avec Camille. Camille accepte : les deux gardent la matière.', async ({ page }) => {
    const state = createState();
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.transfer).click();
    await subjectCard(page, 2).getByTestId(ui.modeShare).click();
    await colleagueButton(page, 2, 10).click();
    await subjectCard(page, 2).getByTestId(ui.continue).click();
    await expect(subjectCard(page, 2).getByTestId(ui.transferConfirm)).toContainText('Lecture');
    await subjectCard(page, 2).getByTestId(ui.send).click();
    await expect(subjectCard(page, 2).getByTestId(ui.transfer)).toBeVisible();
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
    await expect(page.getByTestId(ui.inviteText)).toContainText('Anne');
    await expect(page.getByTestId(ui.inviteText)).toContainText('Lecture');
    await page.getByTestId(ui.inviteAccept).click();
    await expect(page.getByTestId(ui.inboxTitle)).toHaveCount(0);
    expect(state.subjects[0].sharedWith).toEqual([{ userId: 1, displayName: 'Anne' }]);
  });

  test('Le nom Calcul est déjà pris. Le professeur demande à Anne de le partager, puis Anne accepte.', async ({ page }) => {
    const state = createState();
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await page.getByTestId(ui.newName).fill('Calcul');
    await page.getByTestId(ui.add).click();
    await expect(page.getByTestId(ui.gradeError)).toHaveText(
      'Une matière de ce nom existe déjà. Tu peux demander à Anne de la partager.',
    );
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
    await expect(page.getByTestId(ui.inviteText)).toContainText('Camille');
    await expect(page.getByTestId(ui.inviteText)).toContainText('Calcul');
    await page.getByTestId(ui.inviteAccept).click();
    await expect(page.getByTestId(ui.shared)).toContainText('Camille');
  });

  test("Camille refuse de partager Lecture. La matière reste à Anne, rien n'est ajouté à la liste de Camille.", async ({ page }) => {
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
    await page.getByTestId(ui.inviteReject).click();
    await expect(page.getByTestId(ui.inviteText)).toHaveCount(0);
    await expect(subjectCard(page, 2).getByTestId(ui.name)).toHaveText('Lecture');
    expect(state.subjects[0].sharedWith).toEqual([]);
  });

  test('Anne suit Lecture sans en être la propriétaire. Transférer ne lui propose que Partager.', async ({ page }) => {
    const state = createState({
      subjects: [
        {
          id: 2,
          name: 'Lecture',
          active: true,
          ownedByMe: false,
          followedByMe: true,
          sharedWith: [{ userId: 4, displayName: 'Maude' }],
        },
      ],
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.transfer).click();
    await expect(subjectCard(page, 2).getByTestId(ui.modeShare)).toBeVisible();
    await expect(subjectCard(page, 2).getByTestId(ui.modeMove)).toHaveCount(0);
  });

  test("Anne choisit Partager. Elle ne voit que Luc, qui n'a pas encore Lecture. Camille, qui l'a déjà, n'apparaît pas.", async ({ page }) => {
    const state = createState({
      colleagues: [
        {
          userId: 10,
          displayName: 'Camille',
          alreadyFollows: true,
          listLabel: 'la possède déjà',
        },
        {
          userId: 11,
          displayName: 'Luc',
          alreadyFollows: false,
          listLabel: 'pas encore dans sa liste',
        },
      ],
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await subjectCard(page, 2).getByTestId(ui.transfer).click();
    await subjectCard(page, 2).getByTestId(ui.modeShare).click();
    await expect(colleagueButton(page, 2, 11)).toContainText('Luc');
    await expect(colleagueButton(page, 2, 10)).toHaveCount(0);
    await expect(page.getByTestId(ui.colleagueList)).toHaveCount(0);
  });

  test('Camille refuse de partager Lecture. Anne garde la matière et lit le refus.', async ({ page }) => {
    const state = createState();
    state.notices = [
      { id: 2, message: 'Camille a refusé de partager Lecture.' },
    ];
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await expect(page.getByTestId('subject-notice-2').getByTestId(ui.noticeText)).toHaveText(
      'Camille a refusé de partager Lecture.',
    );
    await expect(subjectCard(page, 2).getByTestId(ui.name)).toHaveText('Lecture');
  });
});

test.describe("Cours déjà existant", () => {
  test("Anne ajoute un cours déjà existant. Elle voit son nom et le nombre de questions qu'il contient déjà.", async ({ page }) => {
    const state = createState({
      addable: [
        {
          name: 'Calcul',
          label: 'Calcul — autre classe',
          schoolId: 9,
          questionCount: 4,
        },
      ],
      allowCreate: true,
    });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await page.getByTestId(ui.reuse).click();
    const reuse = page.getByTestId('subject-reuse-9|Calcul');
    await expect(reuse).toContainText('Calcul');
    await expect(reuse).toContainText('4');
    await reuse.click();
    await expect(subjectCard(page, 50).getByTestId(ui.name)).toHaveText('Calcul');
    await expect(subjectCard(page, 50).getByTestId(ui.questions)).toContainText('4');
    expect(state.created).toEqual([{ schoolId: 1, grade: '3e primaire', name: 'Calcul' }]);
  });
});

interface AddableCourseState {
  name: string;
  label: string;
  schoolId: number;
  questionCount: number;
}

interface ColleagueState {
  userId: number;
  displayName: string;
  alreadyFollows?: boolean;
  listLabel?: string;
  refusedAction?: string;
}

interface NoticeState {
  id: number;
  message: string;
}

interface MockState {
  subjects: SubjectState[];
  colleagues: ColleagueState[];
  invites: InviteState[];
  notices: NoticeState[];
  pendingTransfers: { subjectId: number; colleagueUserId: number; mode: Mode }[];
  shareRequests: { schoolId: number; grade: string; name: string }[];
  addable: AddableCourseState[];
  allowCreate: boolean;
  created: { schoolId: number; grade: string; name: string }[];
  nextInviteId: number;
  /** Le refus de reprise retire la matière : plus personne ne pouvait l'accepter. */
  removeSubjectWhenHandoverRefused: boolean;
  /** Le chargement des enfants qui suivent le cours échoue. */
  followersFail: boolean;
}

function createState(partial?: {
  subjects?: SubjectState[];
  colleagues?: ColleagueState[];
  addable?: AddableCourseState[];
  allowCreate?: boolean;
}): MockState {
  return {
    subjects: partial?.subjects ?? [
      { id: 2, name: 'Lecture', active: true, ownedByMe: true, sharedWith: [], questionCount: 0 },
    ],
    colleagues:
      partial?.colleagues !== undefined
        ? partial.colleagues
        : [{ userId: 10, displayName: 'Camille' }],
    invites: [],
    notices: [],
    pendingTransfers: [],
    shareRequests: [],
    addable: partial?.addable ?? [],
    allowCreate: partial?.allowCreate === true,
    created: [],
    nextInviteId: 1,
    removeSubjectWhenHandoverRefused: false,
    followersFail: false,
  };
}

async function openMatieres(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    sessionStorage.setItem('admin.jwt', token);
  }, teacherJwt());
  await page.goto('/teacher/matieres');
  await expect(page.getByTestId(ui.subtitle)).toBeVisible();
}

async function mockTeacherApis(page: Page, state: MockState): Promise<void> {
  await page.route('**/api/int/auth/spaces', async (route) => {
    await json(route, { roles: ['teacher'], teacherRequest: 'approved' });
  });

  await page.route('**/api/int/auth/me', async (route) => {
    await json(route, { email: 'anne@example.com', displayName: 'Anne' });
  });

  await page.route(
    (url) => url.pathname.includes('/teacher/subjects/transfer-invites'),
    async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/').filter((part) => part.length > 0);
      const action = parts[parts.length - 1];
      if (action === 'transfer-invites') {
        await json(route, { invites: state.invites });
        return;
      }
      const inviteId = Number(parts[parts.length - 2]);
      const invite = state.invites.find((row) => row.id === inviteId);
      if (!invite || (action !== 'accept' && action !== 'reject')) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
        return;
      }
      if (action === 'accept') {
        applyAccept(state, invite);
      } else {
        applyReject(state, invite);
      }
      state.invites = state.invites.filter((row) => row.id !== inviteId);
      await route.fulfill({ status: 204, body: '' });
    },
  );

  await page.route('**/api/int/teacher/subjects/deactivate-notices/**', async (route) => {
    const parts = new URL(route.request().url()).pathname.split('/').filter((part) => part.length > 0);
    const noticeId = Number(parts[parts.length - 2]);
    state.notices = state.notices.filter((row) => row.id !== noticeId);
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route('**/api/int/teacher/subjects/deactivate-notices', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, { notices: state.notices });
  });

  await page.route(/\/api\/int\/teacher\/subjects\/\d+\/colleagues$/, async (route) => {
    await json(route, { colleagues: state.colleagues });
  });

  await page.route(/\/api\/int\/teacher\/subjects\/\d+\/followers$/, async (route) => {
    if (state.followersFail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Impossible de savoir qui suit ce cours.' }),
      });
      return;
    }
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
    const subject = state.subjects.find((row) => row.id === subjectId);
    if (subject && subject.ownedByMe === false && subject.sharedWith.length > 0) {
      subject.followedByMe = false;
    } else {
      state.subjects = state.subjects.filter((row) => row.id !== subjectId);
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route(
    (url) => url.pathname.endsWith('/teacher/subjects'),
    async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { schoolId: number; grade: string; name: string };
        if (!state.allowCreate) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'Une matière de ce nom existe déjà. Tu peux demander à Anne de la partager.',
            }),
          });
          return;
        }
        state.created.push(body);
        const course = state.addable.find((item) => item.name === body.name);
        state.subjects.push({
          id: 50,
          name: body.name,
          active: true,
          ownedByMe: true,
          sharedWith: [],
          questionCount: course?.questionCount ?? 0,
        });
        state.addable = state.addable.filter((item) => item.name !== body.name);
        await json(route, { id: 50, name: body.name });
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
            grades: [
              {
                grade: '3e primaire',
                subjects: state.subjects,
                addableCourses: state.addable,
              },
            ],
          },
        ],
      });
    },
  );

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
      questionCount: 0,
    });
    return;
  }
  if (invite.mode === 'share' || invite.mode === 'ask') {
    subject.followedByMe = true;
    if (!subject.sharedWith.some((row) => row.displayName === invite.fromDisplayName)) {
      subject.sharedWith = [...subject.sharedWith, fromHolder];
    }
    return;
  }
  if (invite.mode === 'handover' || invite.mode === 'move') {
    subject.followedByMe = true;
    subject.ownedByMe = true;
    subject.sharedWith = subject.sharedWith.filter((row) => row.displayName !== invite.fromDisplayName);
  }
}

function applyReject(state: MockState, invite: InviteState): void {
  if (invite.mode === 'handover' && state.removeSubjectWhenHandoverRefused) {
    state.subjects = state.subjects.filter((row) => row.id !== invite.subjectId);
  }
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

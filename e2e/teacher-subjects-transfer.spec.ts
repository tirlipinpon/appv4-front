import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Workflows matières professeur : partage, déplacement, invites, retrait
 * (dernier détenteur vs partagée). APIs mockées — pas besoin du back.
 */

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
    await page.getByRole('button', { name: 'Retirer' }).first().click();
    await page.getByRole('button', { name: 'Confirmer le retrait' }).click();
    await expect(page.getByText('Lecture')).toHaveCount(0);
    expect(state.subjects.find((s) => s.id === 2)).toBeUndefined();
  });

  test("Anne est la seule sur Lecture et aucun collègue n'a cette classe. Elle ne peut que confirmer le retrait.", async ({ page }) => {
    const state = createState({ colleagues: [] });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await page.getByRole('button', { name: 'Retirer' }).first().click();
    await expect(page.getByText(/plus aucun professeur ne la verra/)).toBeVisible();
    await expect(page.getByText('Aucun collègue avec cette classe.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déplacer vers un collègue' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Confirmer le retrait' }).click();
    await expect(page.getByText('Lecture')).toHaveCount(0);
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
    await page.getByRole('button', { name: 'Retirer' }).click();
    await expect(page.getByText(/Camille la garde/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déplacer vers un collègue' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Demander la reprise' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Confirmer le retrait' }).click();
    await expect(page.getByText('Suivie par Camille')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retirer' })).toHaveCount(0);
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
    await page.getByRole('button', { name: 'Retirer' }).click();
    await expect(page.getByText(/Tu es le seul dessus/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déplacer vers un collègue' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Confirmer le retrait' })).toBeVisible();
  });

  test("On ne sait pas quels enfants suivent Lecture. Le retrait s'arrête, et la matière reste.", async ({ page }) => {
    const state = createState();
    state.followersFail = true;
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await page.getByRole('button', { name: 'Retirer' }).first().click();
    await expect(page.getByText('Impossible de savoir qui suit ce cours.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmer le retrait' })).toHaveCount(0);
    await expect(page.getByText('Lecture', { exact: true })).toBeVisible();
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
    await page.getByRole('button', { name: 'Retirer' }).click();
    await expect(page.getByText(/Pour quitter Mathématiques/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déplacer vers un collègue' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Confirmer le retrait' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Camille' }).click();
    const sent = page.waitForResponse(
      (response) => response.url().includes('/transfer') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Demander la reprise' }).click();
    await sent;
    expect(state.pendingTransfers[0]).toMatchObject({ mode: 'handover', colleagueUserId: 10 });
    await expect(page.getByText('Mathématiques', { exact: true })).toBeVisible();
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
    await page.getByRole('button', { name: 'Retirer' }).click();
    await expect(page.getByText('déjà refusé Demander la reprise')).toBeVisible();
    await expect(page.getByRole('button', { name: /Camille/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Luc', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: /Camille/ }).click({ force: true });
    await expect(page.getByRole('button', { name: 'Demander la reprise', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Luc', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Demander la reprise', exact: true })).toBeEnabled();
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
    await page.getByRole('button', { name: 'Retirer' }).click();
    await expect(page.getByRole('button', { name: /Camille/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Luc/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Demander la reprise', exact: true })).toBeDisabled();
    await expect(page.getByText(/Pour quitter Mathématiques/)).toBeVisible();
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
    await expect(page.getByText(/Camille te demande de reprendre Mathématiques/)).toBeVisible();
    await page.getByRole('button', { name: 'Accepter' }).click();
    await expect(page.getByRole('heading', { name: 'À traiter' })).toHaveCount(0);
    await expect(page.getByText('Partagée avec Luc')).toBeVisible();
    await expect(page.getByText('Partagée avec Camille')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Renommer' })).toBeVisible();
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
    await page.getByRole('button', { name: 'Refuser' }).click();
    await expect(page.getByText(/Luc te demande de reprendre/)).toHaveCount(0);
    await expect(page.getByText('Mathématiques', { exact: true })).toBeVisible();
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
    await page.getByRole('button', { name: 'Refuser' }).click();
    await expect(page.getByText('Mathématiques', { exact: true })).toHaveCount(0);
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
    await page.getByRole('button', { name: 'Retirer' }).click();
    await expect(page.getByText('déjà refusé')).toHaveCount(0);
    await page.getByRole('button', { name: 'Camille', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Demander la reprise' })).toBeEnabled();
  });
});

test.describe("Déplacer", () => {
  test('Anne est seule sur Lecture et la déplace vers Camille. Camille accepte : elle en devient la seule propriétaire.', async ({ page }) => {
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
    await expect(page.getByRole('heading', { name: 'À traiter' })).toHaveCount(0);
    // Destinataire : la matière reste, sans co-prof (seul accès après move).
    await expect(page.getByText('Lecture', { exact: true })).toBeVisible();
    await expect(page.getByText(/Partagée avec/)).toHaveCount(0);
    expect(state.subjects.find((s) => s.id === 2)?.sharedWith).toEqual([]);
    expect(state.subjects.find((s) => s.id === 2)?.ownedByMe).toBe(true);
  });

  test('Anne est la seule sur Lecture. Au lieu de la retirer, elle propose de la déplacer vers Camille.', async ({ page }) => {
    const state = createState();
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await page.getByRole('button', { name: 'Retirer' }).first().click();
    await expect(page.getByText(/plus aucun professeur ne la verra/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déplacer vers un collègue' })).toBeVisible();
  
    await page.getByRole('button', { name: 'Déplacer vers un collègue' }).click();
    await expect(page.getByRole('button', { name: 'Partager' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Camille' })).toBeVisible();
    await page.getByRole('button', { name: 'Camille' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    const sent = page.waitForResponse(
      (response) => response.url().includes('/transfer') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Envoyer la demande' }).click();
    await sent;
    expect(state.pendingTransfers[0]).toMatchObject({ mode: 'move', colleagueUserId: 10 });
    await expect(page.getByText('Lecture')).toBeVisible();
  });

  test("Anne veut transférer Lecture, mais aucun collègue n'a cette classe. Le bouton Continuer reste grisé.", async ({ page }) => {
    const state = createState({ colleagues: [] });
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await page.getByRole('button', { name: 'Transférer' }).first().click();
    await expect(page.getByText('Aucun collègue avec cette classe.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuer' })).toBeDisabled();
  });

  test('Anne est propriétaire : Transférer lui propose Déplacer et Partager.', async ({ page }) => {
    const state = createState();
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await page.getByRole('button', { name: 'Transférer' }).first().click();
    await expect(page.getByRole('button', { name: 'Déplacer', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Partager' })).toBeVisible();
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
    await page.getByRole('button', { name: 'Transférer' }).first().click();
    await page.getByRole('button', { name: 'Déplacer', exact: true }).click();
    await expect(page.getByRole('button', { name: /Camille/ })).toContainText('la possède déjà');
    await expect(page.getByRole('button', { name: /Luc/ })).toContainText('pas encore dans sa liste');
    await page.getByRole('button', { name: /Camille/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByText(/Proposer de déplacer Lecture/)).toBeVisible();
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
    await page.getByRole('button', { name: 'Transférer' }).first().click();
    await page.getByRole('button', { name: 'Déplacer', exact: true }).click();
    await expect(page.getByText('déjà refusé Déplacer')).toBeVisible();
    await expect(page.getByRole('button', { name: /Camille/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Luc/ })).toBeEnabled();
    await page.getByRole('button', { name: /Luc/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Envoyer la demande' }).click();
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
    await expect(page.getByText(/Camille propose de déplacer Lecture/)).toBeVisible();
    await page.getByRole('button', { name: 'Accepter' }).click();
    await expect(page.getByRole('button', { name: 'Renommer' })).toBeVisible();
    await expect(page.getByText('Partagée avec Luc')).toBeVisible();
    await expect(page.getByText('Partagée avec Camille')).toHaveCount(0);
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
    await expect(page.getByRole('heading', { name: 'À traiter' })).toBeVisible();
    await expect(page.getByText('Camille a refusé le déplacement de Lecture.')).toBeVisible();
    await expect(page.getByText('Lecture', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByText('Camille a refusé le déplacement de Lecture.')).toHaveCount(0);
  });
});

test.describe("Partager", () => {
  test('Anne propose de partager Lecture avec Camille. Camille accepte : les deux gardent la matière.', async ({ page }) => {
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
    await expect(page.getByRole('heading', { name: 'À traiter' })).toHaveCount(0);
    expect(state.subjects[0].sharedWith).toEqual([{ userId: 1, displayName: 'Anne' }]);
  });

  test('Le nom Calcul est déjà pris. Le professeur demande à Anne de le partager, puis Anne accepte.', async ({ page }) => {
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
    await page.getByRole('button', { name: 'Refuser' }).click();
    await expect(page.getByText(/Anne propose de partager/)).toHaveCount(0);
    await expect(page.getByText('Lecture', { exact: true })).toBeVisible();
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
    await page.getByRole('button', { name: 'Transférer' }).click();
    await expect(page.getByRole('button', { name: 'Partager' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déplacer', exact: true })).toHaveCount(0);
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
    await page.getByRole('button', { name: 'Transférer' }).first().click();
    await page.getByRole('button', { name: 'Partager' }).click();
    await expect(page.getByRole('button', { name: /Luc/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Camille/ })).toHaveCount(0);
    await expect(page.getByText('la possède déjà')).toHaveCount(0);
    await expect(page.getByText('pas encore dans sa liste')).toHaveCount(0);
  });

  test('Camille refuse de partager Lecture. Anne garde la matière et lit le refus.', async ({ page }) => {
    const state = createState();
    state.notices = [
      { id: 2, message: 'Camille a refusé de partager Lecture.' },
    ];
    await mockTeacherApis(page, state);
  
    await openMatieres(page);
    await expect(page.getByText('Camille a refusé de partager Lecture.')).toBeVisible();
    await expect(page.getByText('Lecture', { exact: true })).toBeVisible();
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
    await page.getByRole('combobox', { name: 'Cours déjà existant' }).click();
    await expect(page.getByRole('option', { name: /Calcul — autre classe/ })).toContainText('4 questions');
    await page.getByRole('option', { name: /Calcul — autre classe/ }).click();
    await expect(page.getByText('Calcul', { exact: true })).toBeVisible();
    await expect(page.getByText('4 questions')).toBeVisible();
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
  await expect(page.getByText('Un nom par classe')).toBeVisible();
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

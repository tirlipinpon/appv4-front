import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Parcours parent (ADMIN-38) : accueil, profil, enfants, matières,
 * plus le refus si la session manque ou si le rôle est professeur.
 * Les API sont simulées : le back n'a pas besoin de tourner.
 * Le professeur reste pour un prochain passage.
 */

const PARENT_URLS = ['/parent', '/parent/profil', '/parent/enfants', '/parent/matieres'] as const;

const ui = {
  nav: 'space-nav',
  accountName: 'account-name',
  logout: 'account-logout',
  navHome: 'parent-nav-home',
  navChildren: 'parent-nav-children',
  navProfile: 'parent-nav-profile',
  navSubjects: 'parent-nav-subjects',
  childHeading: 'child-heading',
  childEmpty: 'child-empty',
  childAdd: 'child-add',
  childForm: 'child-form',
  childFormTitle: 'child-form-title',
  childFormAlert: 'child-form-alert',
  childFormClose: 'child-form-close',
  childFormSave: 'child-form-save',
  childFirstName: 'child-first-name',
  childLastName: 'child-last-name',
  childSexField: 'child-sex-field',
  childSexGirl: 'child-sex-FILLE',
  childAgeField: 'child-age-field',
  childCountry: 'child-country',
  childSchoolField: 'child-school-field',
  childGrade: 'child-grade',
  childPin: 'child-pin',
  childPinConfirm: 'child-pin-confirm',
  childSchoolsMore: 'child-schools-more',
  childEdit: 'child-edit',
  childCopy: 'child-copy',
  childDeactivate: 'child-deactivate',
  childReactivate: 'child-reactivate',
  childDelete: 'child-delete',
  childPending: 'child-pending',
  childPendingCancel: 'child-pending-cancel',
  childDeactivateConfirm: 'child-deactivate-confirm',
  childRemoveConfirm: 'child-remove-confirm',
  childInactive: 'child-inactive',
  childSex: 'child-sex',
  childAge: 'child-age',
  childSchool: 'child-school',
  childLinksSaved: 'child-links-saved',
  childLinkRemove: 'child-link-remove',
  childLinkTarget: 'child-link-target',
  childLinkKind: 'child-link-kind',
  profileEmail: 'profile-email',
  profileName: 'profile-name',
  profileContact: 'profile-contact',
  profilePhone: 'profile-phone',
  profileSave: 'profile-save',
  profileNameAlert: 'profile-name-alert',
  profileAlert: 'profile-alert',
  profileSaved: 'profile-saved',
  profileAvatarNone: 'profile-avatar-none',
  profileAvatarOwl: 'profile-avatar-owl',
  subjectsHeading: 'parent-subjects-heading',
  subjectsEmpty: 'parent-subjects-empty',
  chosenOtherEmpty: 'parent-chosen-other-empty',
  offerClass: 'parent-offer-class',
  offerExtra: 'parent-offer-extra',
  offerAdd: 'parent-offer-add',
  offerRemove: 'parent-offer-remove',
  offerConfirm: 'parent-offer-confirm',
  offerCancel: 'parent-offer-cancel',
  offerConfirmButton: 'parent-offer-confirm-button',
  subjectQuery: 'parent-subject-query',
  subjectGrade: 'parent-subject-grade',
  subjectSearch: 'parent-subject-search',
  subjectNext: 'parent-subject-next',
  subjectPrevious: 'parent-subject-previous',
  requestTeacher: 'request-teacher-space',
  pendingTitle: 'teacher-pending-title',
  pendingBack: 'teacher-pending-back',
  roleParent: 'role-tab-parent',
  roleTeacher: 'role-tab-teacher',
} as const;

const LINK_LABEL: Record<string, string> = {
  FRERE: 'Frère',
  SOEUR: 'Sœur',
  DEMI_FRERE: 'Demi-frère',
  DEMI_SOEUR: 'Demi-sœur',
  JUMEAU: 'Jumeau',
  JUMELLE: 'Jumelle',
  COUSIN: 'Cousin',
  COUSINE: 'Cousine',
};

interface Profile {
  email: string;
  displayName: string;
  contactEmail: string;
  phone: string;
  avatarCode: string;
  avatarChoices: { code: string; label: string }[];
}

interface ChildLink {
  otherChildId: number;
  label: string;
}

interface ChildRow {
  id: number;
  firstName: string;
  lastName: string;
  sex: string;
  age: number;
  country: string;
  grade: string;
  schoolId: number | null;
  schoolName: string;
  avatarCode: string;
  active: boolean;
  links: ChildLink[];
}

interface Offer {
  childId: number;
  subjectId: number;
  name: string;
  teacherName: string;
  schoolId: number;
  schoolName: string;
  grade: string;
  scolaire: boolean;
}

interface World {
  roles: string[];
  teacherRequest: 'none' | 'pending';
  profile: Profile;
  children: ChildRow[];
  nextChildId: number;
  chosen: Offer[];
  catalog: Offer[];
}

const SCHOOLS = [
  { id: 1, name: 'École Nouvelle', country: 'Belgique', grades: ['CE1', 'CE2'] },
  { id: 2, name: 'École du Parc', country: 'Belgique', grades: ['CE1'] },
];

test('sans session, chaque page parent revient au login', async ({ page }) => {
  for (const url of PARENT_URLS) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test('un professeur n entre pas dans les pages parent', async ({ page }) => {
  await signIn(page, parentWorld({ roles: ['teacher'] }), 'teacher');
  for (const url of PARENT_URLS) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/teacher$/);
  }
});

test('le parent ouvre chaque page puis se deconnecte', async ({ page }) => {
  const world = parentWorld();
  await signIn(page, world, 'parent');

  await page.goto('/parent');
  await expect(page.getByTestId(ui.nav)).toBeVisible();
  await expect(page.getByTestId(ui.accountName)).toHaveText('Camille Parent');

  await page.goto('/parent/enfants');
  await expect(page.getByTestId(ui.childHeading)).toBeVisible();
  await expect(page.getByTestId(ui.childEmpty)).toBeVisible();

  await page.goto('/parent/profil');
  await expect(page.getByTestId(ui.profileEmail)).toContainText('parent@example.com');
  await expect(page.getByTestId(ui.profileName)).toHaveValue('Camille Parent');

  await page.goto('/parent/matieres');
  await expect(page.getByTestId(ui.subjectsHeading)).toBeVisible();
  await expect(page.getByTestId(ui.subjectsEmpty)).toBeVisible();

  await page.getByTestId(ui.navHome).click();
  await expect(page).toHaveURL(/\/parent$/);
  await page.getByTestId(ui.navChildren).click();
  await expect(page).toHaveURL(/\/parent\/enfants$/);
  await page.getByTestId(ui.navProfile).click();
  await expect(page).toHaveURL(/\/parent\/profil$/);
  await page.getByTestId(ui.navSubjects).click();
  await expect(page).toHaveURL(/\/parent\/matieres$/);

  await page.getByTestId(ui.logout).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/parent');
  await expect(page).toHaveURL(/\/login$/);
});

test('le profil se corrige, refuse un nom vide, et montre le message de l api', async ({ page }) => {
  const world = parentWorld();
  await signIn(page, world, 'parent');
  await page.goto('/parent/profil');
  await expect(page.getByTestId(ui.profileEmail)).toContainText('parent@example.com');

  await page.getByTestId(ui.profileName).fill('');
  await page.getByTestId(ui.profileSave).click();
  await expect(page.getByTestId(ui.profileNameAlert)).toBeVisible();
  await expect(page.getByTestId(ui.profileSaved)).toHaveCount(0);

  await page.getByTestId(ui.profileName).fill('Camille Martin');
  await page.getByTestId(ui.profileContact).fill('contact.parent@example.com');
  await page.getByTestId(ui.profilePhone).fill('+32 470 00 00 00');
  await page.getByTestId(ui.profileAvatarNone).click();
  await page.getByTestId(ui.profileAvatarOwl).click();
  await page.getByTestId(ui.profileSave).click();
  await expect(page.getByTestId(ui.profileSaved)).toBeVisible();
  await expect(page.getByTestId(ui.accountName)).toHaveText('Camille Martin');
  await expect(page.getByTestId(ui.profileContact)).toHaveValue('contact.parent@example.com');
  await expect(page.getByTestId(ui.profilePhone)).toHaveValue('+32 470 00 00 00');

  await page.getByTestId(ui.profileContact).fill('pas-un-mail');
  await page.getByTestId(ui.profileSave).click();
  await expect(page.getByTestId(ui.profileAlert)).toBeVisible();
  await expect(page.getByTestId(ui.profileSaved)).toHaveCount(0);
});

test('le formulaire enfant refuse une saisie incomplete', async ({ page }) => {
  await signIn(page, parentWorld(), 'parent');
  await page.goto('/parent/enfants');
  await page.getByTestId(ui.childAdd).click();
  await expect(page.getByTestId(ui.childFormTitle)).toBeVisible();

  await page.getByTestId(ui.childFormSave).click();
  await expect(page.getByTestId(ui.childFormAlert)).toBeVisible();

  await chooseTestId(page, ui.childSexField, ui.childSexGirl);
  await page.getByTestId(ui.childFormSave).click();
  await expect(page.getByTestId(ui.childFormAlert)).toBeVisible();

  await page.getByTestId(ui.childAgeField).fill('8');
  await page.getByTestId(ui.childPin).fill('12');
  await page.getByTestId(ui.childPinConfirm).fill('12');
  await page.getByTestId(ui.childFormSave).click();
  await expect(page.getByTestId(ui.childFormAlert)).toBeVisible();

  await page.getByTestId(ui.childPin).fill('1234');
  await page.getByTestId(ui.childPinConfirm).fill('9999');
  await page.getByTestId(ui.childFormSave).click();
  await expect(page.getByTestId(ui.childFormAlert)).toBeVisible();

  await page.getByTestId(ui.childPinConfirm).fill('1234');
  await page.getByTestId(ui.childFormSave).click();
  await expect(page.getByTestId(ui.childFormAlert)).toBeVisible();

  await page.getByTestId(ui.childFormClose).click();
  await expect(page.getByTestId(ui.childFormTitle)).toHaveCount(0);
});

test('le parent ajoute un enfant avec ecole, puis peut en preparer un autre', async ({ page }) => {
  await signIn(page, parentWorld(), 'parent');
  await page.goto('/parent/enfants');
  await expect(page.getByTestId(ui.childEmpty)).toBeVisible();

  await page.getByTestId(ui.childAdd).click();
  await fillChild(page, { firstName: 'Léa', lastName: 'Martin' });
  await page.getByTestId(ui.childFormSave).click();

  const lea = childCard(page, 'Léa Martin');
  await expect(lea).toBeVisible();
  await expect(lea.getByTestId(ui.childSex)).toBeVisible();
  await expect(lea.getByTestId(ui.childAge)).toContainText('8');
  await expect(lea.getByTestId(ui.childSchool)).toContainText('École Nouvelle');
  await expect(page.getByTestId(ui.childFormTitle)).toHaveCount(0);

  await lea.getByTestId(ui.childCopy).click();
  await expect(page.getByTestId(ui.childFormTitle)).toBeVisible();
  await expect(page.getByTestId(ui.childLastName)).toHaveValue('Martin');
  await expect(page.getByTestId(ui.childFirstName)).toHaveValue('');
  await page.getByTestId(ui.childFormClose).click();
});

test('le parent modifie, desactive, reactive, puis retire un enfant', async ({ page }) => {
  const world = parentWorld({
    children: [childRow(1, { firstName: 'Léa', lastName: 'Martin' })],
    nextChildId: 2,
  });
  await signIn(page, world, 'parent');
  await page.goto('/parent/enfants');

  const lea = childCard(page, 'Léa Martin');
  await lea.getByTestId(ui.childEdit).click();
  await expect(page.getByTestId(ui.childFormTitle)).toBeVisible();
  await page.getByTestId(ui.childFirstName).fill('Lina');
  await page.getByTestId(ui.childFormSave).click();
  await expect(childCard(page, 'Lina Martin')).toBeVisible();

  const lina = childCard(page, 'Lina Martin');
  await lina.getByTestId(ui.childDeactivate).click();
  await expect(lina.getByTestId(ui.childPending)).toContainText('Lina Martin');
  await lina.getByTestId(ui.childPendingCancel).click();
  await expect(lina.getByTestId(ui.childPending)).toHaveCount(0);

  await lina.getByTestId(ui.childDeactivate).click();
  await lina.getByTestId(ui.childDeactivateConfirm).click();
  await expect(lina.getByTestId(ui.childInactive)).toBeVisible();
  await lina.getByTestId(ui.childReactivate).click();
  await expect(lina.getByTestId(ui.childInactive)).toHaveCount(0);
  await expect(lina.getByTestId(ui.childDeactivate)).toBeVisible();

  await lina.getByTestId(ui.childDelete).click();
  await expect(lina.getByTestId(ui.childPending)).toContainText('Lina Martin');
  await lina.getByTestId(ui.childPendingCancel).click();
  await lina.getByTestId(ui.childDelete).click();
  await lina.getByTestId(ui.childRemoveConfirm).click();
  await expect(page.getByTestId(ui.childEmpty)).toBeVisible();
});

test('le parent lie deux enfants puis retire le lien', async ({ page }) => {
  const world = parentWorld({
    children: [
      childRow(1, { firstName: 'Léa', lastName: 'Martin', sex: 'FILLE' }),
      childRow(2, { firstName: 'Noah', lastName: 'Martin', sex: 'GARCON' }),
    ],
    nextChildId: 3,
  });
  await signIn(page, world, 'parent');
  await page.goto('/parent/enfants');

  await childCard(page, 'Léa Martin').getByTestId(ui.childEdit).click();
  await chooseTestId(page, ui.childLinkTarget, 'child-link-target-2');
  await chooseTestId(page, ui.childLinkKind, 'child-link-kind-FRERE');
  await page.getByTestId(ui.childFormSave).click();

  const leaChip = childCard(page, 'Léa Martin').getByTestId('child-link-chip');
  await expect(leaChip).toContainText('Frère');
  await childCard(page, 'Léa Martin').getByTestId(ui.childEdit).click();
  await expect(page.getByTestId(ui.childLinksSaved)).toBeVisible();
  await page.getByTestId(ui.childLinkRemove).click();
  await expect(leaChip).toHaveCount(0);
});

test('le parent cherche une matiere, l ajoute, puis la retire', async ({ page }) => {
  const world = parentWorld({
    children: [childRow(3, { firstName: 'Léa', lastName: 'Martin' })],
    nextChildId: 4,
    chosen: [offer(3, 11, 'Mathématiques', 'Prof A', true)],
    catalog: [offer(3, 12, 'Anglais', 'Prof B', false)],
  });
  await signIn(page, world, 'parent');
  await page.goto('/parent/matieres');

  await expect(page.getByText('Léa Martin')).toBeVisible();
  await expect(offerCard(page, 11).getByTestId(ui.offerClass)).toBeVisible();
  await expect(page.getByTestId(ui.chosenOtherEmpty)).toBeVisible();

  await page.getByTestId(ui.subjectQuery).fill('anglais');
  await page.getByTestId(ui.subjectGrade).fill('CE2');
  await page.getByTestId(ui.subjectSearch).click();

  const anglais = offerCard(page, 12);
  await expect(anglais.getByTestId(ui.offerExtra)).toBeVisible();
  await expect(anglais).toContainText('Anglais');
  await anglais.getByTestId(ui.offerAdd).click();
  await expect(anglais.getByTestId(ui.offerRemove)).toBeVisible();

  await anglais.getByTestId(ui.offerRemove).click();
  await expect(anglais.getByTestId(ui.offerConfirm)).toContainText('Anglais');
  await expect(anglais.getByTestId(ui.offerConfirm)).toContainText('Léa');
  await anglais.getByTestId(ui.offerCancel).click();
  await expect(anglais.getByTestId(ui.offerConfirm)).toHaveCount(0);

  await anglais.getByTestId(ui.offerRemove).click();
  await anglais.getByTestId(ui.offerConfirmButton).click();
  await expect(anglais.getByTestId(ui.offerAdd)).toBeVisible();
  await expect(offerCard(page, 11).getByTestId(ui.offerRemove)).toBeVisible();
});

test('la recherche de matieres passe a la page suivante puis revient', async ({ page }) => {
  const world = parentWorld({
    children: [childRow(3, { firstName: 'Léa', lastName: 'Martin' })],
    nextChildId: 4,
    catalog: [
      offer(3, 21, 'Anglais', 'Prof B', false),
      offer(3, 22, 'Dessin', 'Prof C', false),
    ],
  });
  await signIn(page, world, 'parent');
  await page.goto('/parent/matieres');
  await page.getByTestId(ui.subjectSearch).click();

  await expect(offerCard(page, 21)).toContainText('Anglais');
  await expect(offerCard(page, 22)).toHaveCount(0);
  await page.getByTestId(ui.subjectNext).click();
  await expect(offerCard(page, 22)).toContainText('Dessin');
  await expect(offerCard(page, 21)).toHaveCount(0);
  await page.getByTestId(ui.subjectPrevious).click();
  await expect(offerCard(page, 21)).toContainText('Anglais');
  await expect(offerCard(page, 22)).toHaveCount(0);
});

test('le parent voit plus d ecoles dans le formulaire', async ({ page }) => {
  await signIn(page, parentWorld(), 'parent');
  await page.goto('/parent/enfants');
  await page.getByTestId(ui.childAdd).click();
  await chooseText(page, ui.childCountry, 'Belgique');
  await page.getByTestId(ui.childSchoolField).fill('École');
  await expect(page.getByTestId('school-1')).toContainText('École Nouvelle');
  await expect(page.getByTestId('school-2')).toHaveCount(0);
  await page.getByTestId(ui.childSchoolsMore).click();
  await expect(page.getByTestId('school-2')).toContainText('École du Parc');
});

test('demander l espace professeur ouvre la page d attente', async ({ page }) => {
  await signIn(page, parentWorld(), 'parent');
  await page.goto('/parent');
  await page.getByTestId(ui.requestTeacher).click();
  await expect(page).toHaveURL(/\/teacher-pending$/);
  await expect(page.getByTestId(ui.pendingTitle)).toBeVisible();
  await page.getByTestId(ui.pendingBack).click();
  await expect(page).toHaveURL(/\/parent$/);
});

test('un compte des deux roles passe au professeur puis revient au parent', async ({ page }) => {
  const world = parentWorld({ roles: ['parent', 'teacher'] });
  await signIn(page, world, 'parent');
  await page.goto('/parent');
  await page.getByTestId(ui.roleTeacher).click();
  await expect(page).toHaveURL(/\/teacher$/);
  await page.getByTestId(ui.roleParent).click();
  await expect(page).toHaveURL(/\/parent$/);
});

function parentWorld(partial: Partial<World> = {}): World {
  return {
    roles: ['parent'],
    teacherRequest: 'none',
    profile: {
      email: 'parent@example.com',
      displayName: 'Camille Parent',
      contactEmail: 'camille@example.com',
      phone: '',
      avatarCode: '',
      avatarChoices: [
        { code: 'owl', label: 'Hibou' },
        { code: 'fox', label: 'Renard' },
      ],
    },
    children: [],
    nextChildId: 1,
    chosen: [],
    catalog: [],
    ...partial,
  };
}

function childRow(id: number, partial: Partial<ChildRow> = {}): ChildRow {
  return {
    id,
    firstName: 'Léa',
    lastName: 'Martin',
    sex: 'FILLE',
    age: 8,
    country: 'Belgique',
    grade: 'CE1',
    schoolId: 1,
    schoolName: 'École Nouvelle',
    avatarCode: 'fox',
    active: true,
    links: [],
    ...partial,
  };
}

function offer(
  childId: number,
  subjectId: number,
  name: string,
  teacherName: string,
  scolaire: boolean,
): Offer {
  return {
    childId,
    subjectId,
    name,
    teacherName,
    schoolId: 1,
    schoolName: 'École Nouvelle',
    grade: 'CE1',
    scolaire,
  };
}

function childCard(page: Page, name: string) {
  return page.locator('li.child').filter({
    has: page.locator('strong', { hasText: name }),
  });
}

function offerCard(page: Page, subjectId: number) {
  return page.getByTestId(`parent-offer-${subjectId}`);
}

async function chooseTestId(page: Page, fieldId: string, optionId: string): Promise<void> {
  await page.getByTestId(fieldId).click();
  await page.getByTestId(optionId).click();
}

async function chooseText(page: Page, fieldId: string, option: string): Promise<void> {
  await page.getByTestId(fieldId).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function fillChild(page: Page, names: { firstName: string; lastName: string }): Promise<void> {
  await page.getByTestId(ui.childFirstName).fill(names.firstName);
  await page.getByTestId(ui.childLastName).fill(names.lastName);
  await chooseTestId(page, ui.childSexField, ui.childSexGirl);
  await page.getByTestId(ui.childAgeField).fill('8');
  await chooseText(page, ui.childCountry, 'Belgique');
  await page.getByTestId(ui.childSchoolField).fill('École');
  await page.getByTestId('school-1').click();
  await chooseText(page, ui.childGrade, 'CE1');
  await page.getByTestId('child-avatar-fox').click();
  await page.getByTestId(ui.childPin).fill('1234');
  await page.getByTestId(ui.childPinConfirm).fill('1234');
}

async function signIn(page: Page, world: World, activeRole: 'parent' | 'teacher'): Promise<void> {
  await page.addInitScript((token) => {
    // Un rechargement après Déconnexion ne doit pas replanter le jeton.
    if (sessionStorage.getItem('e2e.jwt.planted')) {
      return;
    }
    sessionStorage.setItem('e2e.jwt.planted', '1');
    sessionStorage.setItem('admin.jwt', token);
  }, jwt({ activeRole, roles: world.roles }));
  await page.route('**/api/int/**', async (route) => handleApi(route, world));
}

function jwt(payload: object): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = Buffer.from(JSON.stringify({ exp, ...payload })).toString('base64url');
  return `e30.${body}.sig`;
}

async function handleApi(route: Route, world: World): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace(/^.*\/api\/int/, '');
  const method = request.method();

  if (path === '/auth/me' && method === 'GET') {
    await fulfill(route, 200, {
      displayName: world.profile.displayName,
      avatarCode: world.profile.avatarCode || null,
    });
    return;
  }
  if (path === '/auth/spaces' && method === 'GET') {
    await fulfill(route, 200, { roles: world.roles, teacherRequest: world.teacherRequest });
    return;
  }
  if (path === '/auth/spaces/teacher' && method === 'POST') {
    world.teacherRequest = 'pending';
    await fulfill(route, 200, { roles: world.roles, teacherRequest: 'pending' });
    return;
  }
  if (path === '/auth/switch-role' && method === 'POST') {
    const body = request.postDataJSON() as { role?: string };
    await fulfill(route, 200, {
      token: jwt({ activeRole: body.role, roles: world.roles }),
      expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    return;
  }
  if (path === '/parent/profile' && method === 'GET') {
    await fulfill(route, 200, world.profile);
    return;
  }
  if (path === '/parent/profile' && method === 'PUT') {
    const body = request.postDataJSON() as { contactEmail?: string; displayName?: string; phone?: string; avatarCode?: string };
    if (typeof body.contactEmail === 'string' && body.contactEmail.includes('pas-un-mail')) {
      await fulfill(route, 400, { message: "Le mail de contact n'est pas valide." });
      return;
    }
    world.profile = { ...world.profile, ...body };
    await fulfill(route, 200, world.profile);
    return;
  }
  if (path === '/parent/children' && method === 'GET') {
    await fulfill(route, 200, {
      children: world.children,
      schools: SCHOOLS,
      curricula: [{ country: 'Belgique', grades: ['CE1', 'CE2'] }],
    });
    return;
  }
  if (path === '/parent/children' && method === 'POST') {
    const body = request.postDataJSON() as Record<string, unknown>;
    const row = childFromBody(world.nextChildId++, body);
    world.children.push(row);
    applyLink(world, row.id, body);
    await fulfill(route, 200, row);
    return;
  }
  const childAction = path.match(/^\/parent\/children\/(\d+)(?:\/(deactivate|reactivate))?$/);
  if (childAction) {
    const id = Number(childAction[1]);
    const action = childAction[2];
    const row = world.children.find((child) => child.id === id);
    if (method === 'PUT' && !action && row) {
      const body = request.postDataJSON() as Record<string, unknown>;
      Object.assign(row, childFromBody(id, body, row));
      applyLink(world, id, body);
      await fulfill(route, 200, row);
      return;
    }
    if (method === 'POST' && action === 'deactivate' && row) {
      row.active = false;
      await fulfill(route, 200, null);
      return;
    }
    if (method === 'POST' && action === 'reactivate' && row) {
      row.active = true;
      await fulfill(route, 200, null);
      return;
    }
    if (method === 'DELETE' && row) {
      world.children = world.children.filter((child) => child.id !== id);
      await fulfill(route, 200, null);
      return;
    }
  }
  if (path === '/parent/subjects' && method === 'GET') {
    await fulfill(route, 200, { children: subjectChildren(world) });
    return;
  }
  if (path === '/parent/subjects' && method === 'POST') {
    const body = request.postDataJSON() as { childId?: number; subjectId?: number };
    const found = world.catalog.find((item) => item.childId === body.childId && item.subjectId === body.subjectId);
    if (found) {
      world.chosen.push(found);
    }
    await fulfill(route, 200, found ?? {});
    return;
  }
  const offers = path.match(/^\/parent\/subjects\/(\d+)\/offers$/);
  if (offers && method === 'GET') {
    const childId = Number(offers[1]);
    const afterId = Number(url.searchParams.get('afterId') ?? '0');
    const chosenIds = new Set(
      world.chosen.filter((item) => item.childId === childId).map((item) => item.subjectId),
    );
    const available = world.catalog.filter((item) => item.childId === childId && !chosenIds.has(item.subjectId));
    const pageOffers = afterId === 0 ? available.slice(0, 1) : available.filter((item) => item.subjectId > afterId);
    const nextCursor = afterId === 0 && available.length > 1 ? available[0].subjectId : null;
    await fulfill(route, 200, { offers: pageOffers, nextCursor });
    return;
  }
  const removal = path.match(/^\/parent\/subjects\/(\d+)\/(\d+)$/);
  if (removal && method === 'DELETE') {
    const childId = Number(removal[1]);
    const subjectId = Number(removal[2]);
    world.chosen = world.chosen.filter((item) => item.childId !== childId || item.subjectId !== subjectId);
    await fulfill(route, 200, null);
    return;
  }
  if (path === '/schools' && method === 'GET') {
    const query = (url.searchParams.get('query') ?? '').trim().toLowerCase();
    const afterId = Number(url.searchParams.get('afterId') ?? '0');
    const found = SCHOOLS.filter((school) => school.name.toLowerCase().includes(query));
    const pageSchools = afterId === 0 ? found.slice(0, 1) : found.filter((school) => school.id > afterId);
    const nextCursor = afterId === 0 && found.length > 1 ? found[0].id : null;
    await fulfill(route, 200, { schools: pageSchools, nextCursor });
    return;
  }

  await fulfill(route, 200, {});
}

function subjectChildren(world: World): unknown[] {
  return world.children.map((child) => ({
    childId: child.id,
    firstName: child.firstName,
    lastName: child.lastName,
    schoolId: child.schoolId,
    schoolName: child.schoolName,
    grade: child.grade,
    chosen: world.chosen.filter((item) => item.childId === child.id),
  }));
}

function childFromBody(id: number, body: Record<string, unknown>, previous?: ChildRow): ChildRow {
  const schoolId = body['schoolId'] == null ? previous?.schoolId ?? null : Number(body['schoolId']);
  const school = SCHOOLS.find((item) => item.id === schoolId);
  return {
    id,
    firstName: stringField(body, 'firstName', previous?.firstName ?? ''),
    lastName: stringField(body, 'lastName', previous?.lastName ?? ''),
    sex: stringField(body, 'sex', previous?.sex ?? 'FILLE'),
    age: body['age'] == null || body['age'] === '' ? previous?.age ?? 0 : Number(body['age']),
    country: stringField(body, 'country', previous?.country ?? ''),
    grade: stringField(body, 'grade', previous?.grade ?? ''),
    schoolId,
    schoolName: school?.name ?? previous?.schoolName ?? '',
    avatarCode: stringField(body, 'avatarCode', previous?.avatarCode ?? ''),
    active: previous?.active ?? true,
    links: previous?.links ?? [],
  };
}

function applyLink(world: World, id: number, body: Record<string, unknown>): void {
  if (body['fromChildId'] == null || typeof body['link'] !== 'string') {
    return;
  }
  const otherId = Number(body['fromChildId']);
  const child = world.children.find((item) => item.id === id);
  const other = world.children.find((item) => item.id === otherId);
  if (!child || !other) {
    return;
  }
  child.links = child.links.filter((link) => link.otherChildId !== otherId);
  other.links = other.links.filter((link) => link.otherChildId !== id);
  if (body['link'] === 'AUCUN') {
    return;
  }
  child.links.push({ otherChildId: otherId, label: LINK_LABEL[body['link']] ?? body['link'] });
  other.links.push({ otherChildId: id, label: reverseLabel(child.sex) });
}

function reverseLabel(sex: string): string {
  if (sex === 'FILLE') {
    return 'Sœur';
  }
  if (sex === 'GARCON') {
    return 'Frère';
  }
  return 'Frère/sœur';
}

function stringField(body: Record<string, unknown>, key: string, fallback: string): string {
  const value = body[key];
  return typeof value === 'string' ? value : fallback;
}

async function fulfill(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

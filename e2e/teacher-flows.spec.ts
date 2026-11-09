import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Parcours professeur : pages, profil, écoles, élèves, questions.
 * Les matières (partage, transfert) restent dans teacher-subjects-transfer.spec.ts.
 * L'API est simulée.
 */

const TEACHER_URLS = [
  '/teacher',
  '/teacher/profil',
  '/teacher/ecoles',
  '/teacher/eleves',
  '/teacher/matieres',
  '/teacher/questions',
] as const;

const ui = {
  nav: 'space-nav',
  navHome: 'nav-teacher-home',
  navProfile: 'nav-teacher-profile',
  navSchools: 'nav-teacher-schools',
  navStudents: 'nav-teacher-students',
  navSubjects: 'nav-teacher-subjects',
  navQuestions: 'nav-teacher-questions',
  logout: 'account-logout',
  accountName: 'account-name',
  switchParent: 'role-switch-parent',
  profileName: 'teacher-profile-name',
  profileContact: 'teacher-profile-contact',
  profilePhone: 'teacher-profile-phone',
  profileAvatarNone: 'teacher-profile-avatar-none',
  profileAvatarOwl: 'teacher-profile-avatar-owl',
  profileSave: 'teacher-profile-save',
  profileSaved: 'teacher-profile-saved',
  profileNameRequired: 'teacher-profile-name-required',
  profileSaveError: 'teacher-profile-save-error',
  schoolsTitle: 'teacher-schools-title',
  schoolAdd: 'teacher-school-add',
  schoolSave: 'teacher-school-save',
  schoolSaved: 'teacher-school-saved',
  schoolRequired: 'teacher-school-required',
  schoolCountry: 'teacher-school-country',
  countryBe: 'teacher-country-Belgique',
  schoolPick: 'teacher-school-pick',
  schoolNew: 'teacher-school-option-1',
  schoolPark: 'teacher-school-option-2',
  schoolsMore: 'teacher-schools-more',
  gradeCe1: 'teacher-grade-CE1',
  schoolRemove: 'teacher-school-remove',
  schoolImpact: 'teacher-school-impact',
  schoolConfirmRemoval: 'teacher-school-confirm-removal',
  studentsEmpty: 'teacher-students-empty',
  questionsTitle: 'teacher-questions-title',
  questionsEmpty: 'teacher-questions-empty',
  questionsSubject: 'teacher-questions-subject',
} as const;

interface CatalogSchool {
  id: number;
  name: string;
  country: string;
  grades: string[];
}

interface AssignedSchool {
  schoolId: number;
  schoolName: string;
  country: string;
  grades: string[];
}

interface Profile {
  email: string;
  displayName: string;
  contactEmail: string;
  phone: string;
  avatarCode: string;
  avatarChoices: { code: string; label: string }[];
  schools: AssignedSchool[];
  availableSchools: CatalogSchool[];
}

interface World {
  roles: string[];
  profile: Profile;
  catalog: CatalogSchool[];
  students: unknown;
  subjectSchools: unknown[];
}

const CATALOG: CatalogSchool[] = [
  { id: 1, name: 'École Nouvelle', country: 'Belgique', grades: ['CE1', 'CE2'] },
  { id: 2, name: 'École du Parc', country: 'Belgique', grades: ['CE1'] },
];

test.describe('parcours professeur', { tag: ['@teacher', '@mock'] }, () => {
  test.describe.configure({ mode: 'parallel' });

  test('sans session, chaque page professeur revient au login', async ({ page }) => {
    for (const url of TEACHER_URLS) {
      await page.goto(url);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('un parent n entre pas dans les pages professeur', async ({ page }) => {
    await signIn(page, teacherWorld(), 'parent');
    for (const url of TEACHER_URLS) {
      await page.goto(url);
      await expect(page).toHaveURL(/\/parent$/);
    }
  });

  test('le professeur ouvre chaque page puis se deconnecte', async ({ page }) => {
    await signIn(page, teacherWorld(), 'teacher');
    await page.goto('/teacher');
    await expect(page.getByTestId(ui.nav)).toBeVisible();
    await expect(page.getByTestId(ui.accountName)).toHaveText('Anne Martin');

    await page.getByTestId(ui.navProfile).click();
    await expect(page).toHaveURL(/\/teacher\/profil$/);
    await page.getByTestId(ui.navSchools).click();
    await expect(page).toHaveURL(/\/teacher\/ecoles$/);
    await expect(page.getByTestId(ui.schoolsTitle)).toBeVisible();
    await page.getByTestId(ui.navStudents).click();
    await expect(page).toHaveURL(/\/teacher\/eleves$/);
    await page.getByTestId(ui.navSubjects).click();
    await expect(page).toHaveURL(/\/teacher\/matieres$/);
    await page.getByTestId(ui.navQuestions).click();
    await expect(page).toHaveURL(/\/teacher\/questions$/);
    await expect(page.getByTestId(ui.questionsTitle)).toBeVisible();
    await page.getByTestId(ui.navHome).click();
    await expect(page).toHaveURL(/\/teacher$/);

    await page.getByTestId(ui.logout).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/teacher');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('le profil se corrige, refuse un nom vide, et montre l erreur de l api', async ({ page }) => {
    const world = teacherWorld();
    await signIn(page, world, 'teacher');
    await page.goto('/teacher/profil');
    await expect(page.getByText('anne@example.com')).toBeVisible();
    await expect(page.getByTestId(ui.profileName)).toHaveValue('Anne Martin');

    await page.getByTestId(ui.profileName).fill('');
    await page.getByTestId(ui.profileSave).click();
    await expect(page.getByTestId(ui.profileNameRequired)).toBeVisible();
    await expect(page.getByTestId(ui.profileSaved)).toHaveCount(0);

    await page.getByTestId(ui.profileName).fill('Anne Dupont');
    await page.getByTestId(ui.profileContact).fill('contact.anne@example.com');
    await page.getByTestId(ui.profilePhone).fill('+32 470 00 00 01');
    await page.getByTestId(ui.profileAvatarNone).click();
    await page.getByTestId(ui.profileAvatarOwl).click();
    await page.getByTestId(ui.profileSave).click();
    await expect(page.getByTestId(ui.profileSaved)).toBeVisible();
    await expect(page.getByTestId(ui.accountName)).toHaveText('Anne Dupont');

    await page.getByTestId(ui.profileContact).fill('pas-un-mail');
    await page.getByTestId(ui.profileSave).click();
    await expect(page.getByTestId(ui.profileSaveError)).toBeVisible();
    await expect(page.getByTestId(ui.profileSaved)).toHaveCount(0);
  });

  test('une ecole sans choix est refusee, puis une classe s enregistre', async ({ page }) => {
    await signIn(page, teacherWorld(), 'teacher');
    await page.goto('/teacher/ecoles');
    await page.getByTestId(ui.schoolAdd).click();
    await page.getByTestId(ui.schoolSave).click();
    await expect(page.getByTestId(ui.schoolRequired)).toBeVisible();
    await expect(page.getByTestId(ui.schoolSaved)).toHaveCount(0);

    await pick(page, ui.schoolCountry, ui.countryBe);
    await pick(page, ui.schoolPick, ui.schoolNew);
    await page.getByTestId(ui.gradeCe1).locator('input').check();
    await page.getByTestId(ui.schoolSave).click();
    await expect(page.getByTestId(ui.schoolSaved)).toBeVisible();
    await expect(page.getByText('École Nouvelle')).toBeVisible();
  });

  test('la liste d ecoles passe a la page suivante', async ({ page }) => {
    await signIn(page, teacherWorld(), 'teacher');
    await page.goto('/teacher/ecoles');
    await page.getByTestId(ui.schoolAdd).click();
    await pick(page, ui.schoolCountry, ui.countryBe);
    await page.getByTestId(ui.schoolPick).click();
    await expect(page.getByTestId(ui.schoolNew)).toBeVisible();
    await expect(page.getByTestId(ui.schoolPark)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByTestId(ui.schoolsMore).click();
    await page.getByTestId(ui.schoolPick).click();
    await expect(page.getByTestId(ui.schoolPark)).toBeVisible();
  });

  test('retirer une ecole deja enregistree montre l eleve concerne', async ({ page }) => {
    const world = teacherWorld({
      profile: profileWithSchool(),
    });
    await signIn(page, world, 'teacher');
    await page.goto('/teacher/ecoles');
    await expect(page.getByText('École Nouvelle')).toBeVisible();
    await page.getByTestId(ui.schoolRemove).click();
    await expect(page.getByTestId(ui.schoolImpact)).toContainText('Léa');
    await expect(page.getByTestId(ui.schoolImpact)).toContainText('Martin');
    await page.getByTestId(ui.schoolConfirmRemoval).click();
    await expect(page.getByText('École Nouvelle')).toHaveCount(0);
  });

  test('sans classe, la page eleves montre le message de l api', async ({ page }) => {
    await signIn(page, teacherWorld(), 'teacher');
    await page.goto('/teacher/eleves');
    await expect(page.getByTestId(ui.studentsEmpty)).toHaveText('Pas encore de classe.');
  });

  test('un eleve inscrit apparait avec son nom', async ({ page }) => {
    const world = teacherWorld({
      students: {
        noClassMessage: '',
        schools: [
          {
            schoolId: 1,
            schoolName: 'École Nouvelle',
            curriculumLabel: 'Belgique',
            grades: [
              {
                grade: 'CE1',
                countLabel: '1 élève',
                emptyMessage: '',
                students: [
                  { id: 3, firstName: 'Léa', lastName: 'Martin', age: 8, avatarCode: 'fox', hasPhoto: false },
                ],
              },
            ],
          },
        ],
      },
    });
    await signIn(page, world, 'teacher');
    await page.goto('/teacher/eleves');
    await expect(page.getByText('École Nouvelle')).toBeVisible();
    await expect(page.getByText('Martin Léa')).toBeVisible();
  });

  test('sans matiere, la page questions le dit', async ({ page }) => {
    await signIn(page, teacherWorld(), 'teacher');
    await page.goto('/teacher/questions');
    await expect(page.getByTestId(ui.questionsEmpty)).toBeVisible();
  });

  test('une matiere suivie s ouvre dans les questions', async ({ page }) => {
    const world = teacherWorld({
      subjectSchools: [
        {
          schoolId: 1,
          schoolName: 'École Nouvelle',
          grades: [
            {
              grade: 'CE1',
              subjects: [{ id: 2, name: 'Lecture', questionCount: 0, followedByMe: true }],
            },
          ],
        },
      ],
    });
    await signIn(page, world, 'teacher');
    await page.goto('/teacher/questions');
    await expect(page.getByTestId(ui.questionsSubject)).toHaveText('Lecture');
  });

  test('un compte des deux roles revient a l espace parent', async ({ page }) => {
    const world = teacherWorld({ roles: ['parent', 'teacher'] });
    await signIn(page, world, 'teacher');
    await page.goto('/teacher');
    await page.getByTestId(ui.switchParent).click();
    await expect(page).toHaveURL(/\/parent$/);
  });
});

function teacherWorld(partial: Partial<World> = {}): World {
  return {
    roles: ['teacher'],
    profile: emptyProfile(),
    catalog: CATALOG,
    students: { noClassMessage: 'Pas encore de classe.', schools: [] },
    subjectSchools: [],
    ...partial,
  };
}

function emptyProfile(): Profile {
  return {
    email: 'anne@example.com',
    displayName: 'Anne Martin',
    contactEmail: 'anne.contact@example.com',
    phone: '',
    avatarCode: '',
    avatarChoices: [
      { code: 'owl', label: 'Hibou' },
      { code: 'fox', label: 'Renard' },
    ],
    schools: [],
    availableSchools: CATALOG,
  };
}

function profileWithSchool(): Profile {
  return {
    ...emptyProfile(),
    schools: [
      { schoolId: 1, schoolName: 'École Nouvelle', country: 'Belgique', grades: ['CE1'] },
    ],
  };
}

async function pick(page: Page, field: string, option: string): Promise<void> {
  await page.getByTestId(field).click();
  await page.getByTestId(option).click();
}

async function signIn(page: Page, world: World, activeRole: 'parent' | 'teacher'): Promise<void> {
  await page.addInitScript((token) => {
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
    await fulfill(route, 200, { roles: world.roles, teacherRequest: 'approved' });
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
  if (path === '/teacher/profile' && method === 'GET') {
    await fulfill(route, 200, world.profile);
    return;
  }
  if (path === '/teacher/profile' && method === 'PUT') {
    const body = request.postDataJSON() as {
      contactEmail?: string;
      displayName?: string;
      phone?: string;
      avatarCode?: string;
      schools?: { schoolId?: number; grades?: string[] }[];
    };
    if (typeof body.contactEmail === 'string' && body.contactEmail.includes('pas-un-mail')) {
      await fulfill(route, 400, { message: "Le mail de contact n'est pas valide.", code: 'BAD_REQUEST' });
      return;
    }
    if (body.schools) {
      world.profile.schools = body.schools.flatMap((item) => {
        const known = world.catalog.find((school) => school.id === item.schoolId);
        if (!known || item.schoolId == null) {
          return [];
        }
        return [{
          schoolId: item.schoolId,
          schoolName: known.name,
          country: known.country,
          grades: item.grades ?? [],
        }];
      });
    } else {
      world.profile = { ...world.profile, ...body, schools: world.profile.schools };
    }
    await fulfill(route, 200, world.profile);
    return;
  }
  if (path === '/teacher/profile/removal-preview' && method === 'GET') {
    await fulfill(route, 200, {
      schoolId: 1,
      schoolName: 'École Nouvelle',
      studentCount: 1,
      studentCountLabel: '1 élève',
      students: [{ id: 3, firstName: 'Léa', lastName: 'Martin', grade: 'CE1' }],
      subjectCount: 0,
      subjectCountLabel: '0 matière',
      emptySubjectsLabel: 'Aucune matière.',
      subjects: [],
    });
    return;
  }
  if (path === '/schools' && method === 'GET') {
    const afterId = Number(url.searchParams.get('afterId') ?? '0');
    const country = url.searchParams.get('country') ?? '';
    const found = world.catalog.filter((school) => school.country === country);
    const schools = afterId === 0 ? found.slice(0, 1) : found.filter((school) => school.id > afterId);
    const nextCursor = afterId === 0 && found.length > 1 ? found[0].id : null;
    await fulfill(route, 200, { schools, nextCursor });
    return;
  }
  if (path === '/teacher/students' && method === 'GET') {
    await fulfill(route, 200, world.students);
    return;
  }
  if (path === '/teacher/subjects' && method === 'GET') {
    await fulfill(route, 200, { schools: world.subjectSchools });
    return;
  }
  if (path === '/teacher/question-forms' && method === 'GET') {
    await fulfill(route, 200, { forms: [] });
    return;
  }
  if (/^\/teacher\/subjects\/\d+\/questions$/.test(path) && method === 'GET') {
    await fulfill(route, 200, { questions: [], nextCursor: null });
    return;
  }

  await fulfill(route, 200, {});
}

async function fulfill(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

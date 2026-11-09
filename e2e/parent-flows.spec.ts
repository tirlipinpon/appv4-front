import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Parcours parent (ADMIN-38) : accueil, profil, enfants, matières,
 * plus le refus si la session manque ou si le rôle est professeur.
 * Les API sont simulées : le back n'a pas besoin de tourner.
 * Le professeur reste pour un prochain passage.
 */

const PARENT_URLS = ['/parent', '/parent/profil', '/parent/enfants', '/parent/matieres'] as const;

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
  await expect(page.getByRole('navigation', { name: 'Pages parent' })).toBeVisible();
  await expect(page.getByText('Camille Parent')).toBeVisible();

  await page.goto('/parent/enfants');
  await expect(page.getByRole('heading', { name: 'Mes enfants' })).toBeVisible();
  await expect(page.getByText("Aucun enfant pour l'instant.")).toBeVisible();

  await page.goto('/parent/profil');
  await expect(page.getByText('parent@example.com')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nom affiché' })).toHaveValue('Camille Parent');

  await page.goto('/parent/matieres');
  await expect(page.getByRole('heading', { name: 'Matières' })).toBeVisible();
  await expect(page.getByText("Aucun enfant pour l'instant.")).toBeVisible();

  await page.getByRole('link', { name: 'Accueil' }).click();
  await expect(page).toHaveURL(/\/parent$/);
  await page.getByRole('link', { name: 'Enfants' }).click();
  await expect(page).toHaveURL(/\/parent\/enfants$/);
  await page.getByRole('link', { name: 'Profil' }).click();
  await expect(page).toHaveURL(/\/parent\/profil$/);
  await page.getByRole('link', { name: 'Matières' }).click();
  await expect(page).toHaveURL(/\/parent\/matieres$/);

  await page.getByRole('button', { name: 'Déconnexion' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/parent');
  await expect(page).toHaveURL(/\/login$/);
});

test('le profil se corrige, refuse un nom vide, et montre le message de l api', async ({ page }) => {
  const world = parentWorld();
  await signIn(page, world, 'parent');
  await page.goto('/parent/profil');
  await expect(page.getByText('parent@example.com')).toBeVisible();

  await page.getByRole('textbox', { name: 'Nom affiché' }).fill('');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Le nom est obligatoire.')).toBeVisible();
  await expect(page.getByText('Enregistré.')).toHaveCount(0);

  await page.getByRole('textbox', { name: 'Nom affiché' }).fill('Camille Martin');
  await page.getByRole('textbox', { name: 'Mail de contact' }).fill('contact.parent@example.com');
  await page.getByRole('textbox', { name: 'Téléphone' }).fill('+32 470 00 00 00');
  await page.getByRole('button', { name: 'Aucun', exact: true }).click();
  await page.getByRole('button', { name: 'Hibou', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Enregistré.')).toBeVisible();
  await expect(page.getByText('Camille Martin').first()).toBeVisible();

  await page.getByRole('textbox', { name: 'Mail de contact' }).fill('pas-un-mail');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText("Le mail de contact n'est pas valide.");
  await expect(page.getByText('Enregistré.')).toHaveCount(0);
});

test('le formulaire enfant refuse une saisie incomplete', async ({ page }) => {
  await signIn(page, parentWorld(), 'parent');
  await page.goto('/parent/enfants');
  await page.getByRole('button', { name: 'Ajouter un enfant' }).click();
  await expect(page.getByText('Nouvel enfant')).toBeVisible();

  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Choisis fille, garçon ou non genré.');

  await choose(page, 'Sexe', 'Fille');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText("L'âge doit être un nombre entier entre 2 et 18.");

  await page.getByRole('textbox', { name: 'Âge' }).fill('8');
  await page.getByRole('textbox', { name: 'Code PIN', exact: true }).fill('12');
  await page.getByRole('textbox', { name: 'Confirmer le code PIN' }).fill('12');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Le code PIN doit faire 4 chiffres.');

  await page.getByRole('textbox', { name: 'Code PIN', exact: true }).fill('1234');
  await page.getByRole('textbox', { name: 'Confirmer le code PIN' }).fill('9999');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Les deux codes PIN ne sont pas les mêmes.');

  await page.getByRole('textbox', { name: 'Confirmer le code PIN' }).fill('1234');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Choisis une photo ou un avatar.');

  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.getByText('Nouvel enfant')).toHaveCount(0);
});

test('le parent ajoute un enfant avec ecole, puis peut en preparer un autre', async ({ page }) => {
  await signIn(page, parentWorld(), 'parent');
  await page.goto('/parent/enfants');
  await expect(page.getByText("Aucun enfant pour l'instant.")).toBeVisible();

  await page.getByRole('button', { name: 'Ajouter un enfant' }).click();
  await fillChild(page, { firstName: 'Léa', lastName: 'Martin' });
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();

  const lea = childCard(page, 'Léa Martin');
  await expect(lea).toBeVisible();
  await expect(lea).toContainText('Fille');
  await expect(lea).toContainText('8 ans');
  await expect(lea).toContainText('École Nouvelle');
  await expect(page.getByText('Nouvel enfant')).toHaveCount(0);

  await lea.getByRole('button', { name: 'Ajouter à partir de celui-ci' }).click();
  await expect(page.getByText('Nouvel enfant')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nom', exact: true })).toHaveValue('Martin');
  await expect(page.getByRole('textbox', { name: 'Prénom' })).toHaveValue('');
  await page.getByRole('button', { name: 'Fermer' }).click();
});

test('le parent modifie, desactive, reactive, puis retire un enfant', async ({ page }) => {
  const world = parentWorld({
    children: [childRow(1, { firstName: 'Léa', lastName: 'Martin' })],
    nextChildId: 2,
  });
  await signIn(page, world, 'parent');
  await page.goto('/parent/enfants');

  const lea = childCard(page, 'Léa Martin');
  await lea.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByText('Modifier', { exact: true }).last()).toBeVisible();
  await page.getByRole('textbox', { name: 'Prénom' }).fill('Lina');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(childCard(page, 'Lina Martin')).toBeVisible();

  const lina = childCard(page, 'Lina Martin');
  await lina.getByRole('button', { name: 'Désactiver' }).click();
  await expect(page.getByText('Désactiver Lina Martin ?')).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByText('Désactiver Lina Martin ?')).toHaveCount(0);

  await lina.getByRole('button', { name: 'Désactiver' }).click();
  await page.getByRole('button', { name: 'Confirmer la désactivation' }).click();
  await expect(lina.getByText('Désactivé')).toBeVisible();
  await lina.getByRole('button', { name: 'Réactiver' }).click();
  await expect(lina.getByText('Désactivé')).toHaveCount(0);
  await expect(lina.getByRole('button', { name: 'Désactiver' })).toBeVisible();

  await lina.getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByText("Retirer Lina Martin de l'affichage ?")).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await lina.getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('button', { name: 'Confirmer le retrait' }).click();
  await expect(page.getByText("Aucun enfant pour l'instant.")).toBeVisible();
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

  await childCard(page, 'Léa Martin').getByRole('button', { name: 'Modifier' }).click();
  await choose(page, 'Lier avec', 'Noah Martin');
  await choose(page, 'Lien avec Noah', 'Frère');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();

  await expect(page.getByText('Frère').first()).toBeVisible();
  await childCard(page, 'Léa Martin').getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByText('Liens déjà enregistrés')).toBeVisible();
  await page.getByRole('button', { name: 'Retirer' }).click();
  await expect(page.getByText('Frère')).toHaveCount(0);
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
  await expect(article(page, 'Mathématiques')).toContainText('Scolaire');
  await expect(page.getByText('Aucune matière').first()).toBeVisible();

  await page.getByRole('textbox', { name: 'Nom de la matière' }).fill('anglais');
  await page.getByRole('textbox', { name: 'Classe (facultatif)' }).fill('CE2');
  await page.getByRole('button', { name: 'Rechercher' }).click();

  const anglais = article(page, 'Anglais');
  await expect(anglais).toContainText('Extra-scolaire');
  await anglais.getByRole('button', { name: 'Ajouter' }).click();
  await expect(anglais.getByRole('button', { name: 'Retirer' })).toBeVisible();

  await anglais.getByRole('button', { name: 'Retirer' }).click();
  await expect(page.getByText('Retirer Anglais de Prof B de la liste de Léa ?')).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByText('Retirer Anglais de Prof B de la liste de Léa ?')).toHaveCount(0);

  await anglais.getByRole('button', { name: 'Retirer' }).click();
  await page.getByRole('button', { name: 'Confirmer le retrait' }).click();
  await expect(anglais.getByRole('button', { name: 'Ajouter' })).toBeVisible();
  await expect(article(page, 'Mathématiques').getByRole('button', { name: 'Retirer' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Rechercher' }).click();

  await expect(article(page, 'Anglais')).toBeVisible();
  await expect(article(page, 'Dessin')).toHaveCount(0);
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(article(page, 'Dessin')).toBeVisible();
  await expect(article(page, 'Anglais')).toHaveCount(0);
  await page.getByRole('button', { name: 'Précédent' }).click();
  await expect(article(page, 'Anglais')).toBeVisible();
  await expect(article(page, 'Dessin')).toHaveCount(0);
});

test('le parent voit plus d ecoles dans le formulaire', async ({ page }) => {
  await signIn(page, parentWorld(), 'parent');
  await page.goto('/parent/enfants');
  await page.getByRole('button', { name: 'Ajouter un enfant' }).click();
  await choose(page, 'Pays', 'Belgique');
  await page.getByRole('combobox', { name: 'École' }).fill('École');
  await expect(page.getByRole('button', { name: 'École Nouvelle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'École du Parc' })).toHaveCount(0);
  await page.getByRole('button', { name: "Voir plus d'écoles" }).click();
  await expect(page.getByRole('button', { name: 'École du Parc' })).toBeVisible();
});

test('demander l espace professeur ouvre la page d attente', async ({ page }) => {
  await signIn(page, parentWorld(), 'parent');
  await page.goto('/parent');
  await page.getByRole('button', { name: "Demander l'espace professeur" }).click();
  await expect(page).toHaveURL(/\/teacher-pending$/);
  await expect(page.getByText('Demande en attente')).toBeVisible();
  await page.getByRole('link', { name: "Retour à l'espace parent" }).click();
  await expect(page).toHaveURL(/\/parent$/);
});

test('un compte des deux roles passe au professeur puis revient au parent', async ({ page }) => {
  const world = parentWorld({ roles: ['parent', 'teacher'] });
  await signIn(page, world, 'parent');
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Professeur' }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  await page.getByRole('button', { name: 'Parent' }).click();
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

function article(page: Page, name: string) {
  return page.locator('article', { hasText: name });
}

async function choose(page: Page, field: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: field }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function fillChild(page: Page, names: { firstName: string; lastName: string }): Promise<void> {
  await page.getByRole('textbox', { name: 'Prénom' }).fill(names.firstName);
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill(names.lastName);
  await choose(page, 'Sexe', 'Fille');
  await page.getByRole('textbox', { name: 'Âge' }).fill('8');
  await choose(page, 'Pays', 'Belgique');
  await page.getByRole('combobox', { name: 'École' }).fill('École');
  await page.getByRole('button', { name: 'École Nouvelle' }).click();
  await choose(page, 'Classe', 'CE1');
  await page.getByRole('button', { name: 'Renard' }).click();
  await page.getByRole('textbox', { name: 'Code PIN', exact: true }).fill('1234');
  await page.getByRole('textbox', { name: 'Confirmer le code PIN' }).fill('1234');
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

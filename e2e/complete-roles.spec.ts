import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:8080/api/int';
const PASSWORD = 'Secret1!';

test('email parent seul arrive sur /parent, et y revient au login suivant', async ({ page }) => {
  const email = uniqueEmail('parent');
  await signupThroughUi(page, email);
  await chooseRoles(page, { parent: true });
  await expect(page).toHaveURL(/\/parent$/);

  await page.getByRole('button', { name: 'Déconnexion' }).click();
  await loginThroughUi(page, email);
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page).not.toHaveURL(/complete-roles/);
});

test('email professeur seul arrive sur la page d attente, et y revient', async ({ page }) => {
  const email = uniqueEmail('teacher');
  await signupThroughUi(page, email);
  await chooseRoles(page, { teacher: true });
  await expect(page).toHaveURL(/\/teacher-pending$/);

  await page.getByRole('link', { name: "Aller à l'accueil" }).click();
  await page.getByRole('button', { name: 'Déconnexion' }).click();
  await loginThroughUi(page, email);
  await expect(page).toHaveURL(/\/teacher-pending$/);
});

test('email avec les deux cases entre dans l espace parent', async ({ page }) => {
  const email = uniqueEmail('both');
  await signupThroughUi(page, email);
  await chooseRoles(page, { parent: true, teacher: true });
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page).not.toHaveURL(/select-role/);
});

test('google neuf passe par le choix de role puis /parent', async ({ page, request }) => {
  const email = uniqueEmail('google');
  const token = await signupByApi(request, email);
  await interceptOAuth(page, 'google', token);
  await page.goto('/auth/callback/google?code=test-code');
  await expect(page).toHaveURL(/\/complete-roles$/);
  await chooseRoles(page, { parent: true });
  await expect(page).toHaveURL(/\/parent$/);
});

test('facebook neuf passe par le choix de role puis /parent', async ({ page, request }) => {
  const email = uniqueEmail('facebook');
  const token = await signupByApi(request, email);
  await interceptOAuth(page, 'facebook', token);
  await page.goto('/auth/callback/facebook?code=test-code');
  await expect(page).toHaveURL(/\/complete-roles$/);
  await chooseRoles(page, { parent: true });
  await expect(page).toHaveURL(/\/parent$/);
});

test('google sur un email deja parent saute la page de choix', async ({ page, request }) => {
  const email = uniqueEmail('linked');
  const fresh = await signupByApi(request, email);
  const chosen = await completeByApi(request, fresh, ['parent']);
  await interceptOAuth(page, 'google', chosen);
  await page.goto('/auth/callback/google?code=test-code');
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page).not.toHaveURL(/complete-roles/);
});

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@example.com`;
}

async function signupThroughUi(page: Page, email: string): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/complete-roles$/);
}

async function loginThroughUi(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

async function chooseRoles(page: Page, choice: { parent?: boolean; teacher?: boolean }): Promise<void> {
  if (choice.parent) {
    await page.getByRole('checkbox', { name: 'Parent' }).check();
  }
  if (choice.teacher) {
    await page.getByRole('checkbox', { name: 'Professeur' }).check();
  }
  await page.getByRole('button', { name: 'Continuer' }).click();
}

async function signupByApi(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post(`${API}/auth/signup`, {
    data: { email, password: PASSWORD, displayName: 'E2E' },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { token: string };
  return body.token;
}

async function completeByApi(
  request: APIRequestContext,
  token: string,
  roles: string[],
): Promise<string> {
  const response = await request.post(`${API}/auth/complete-roles`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { roles },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { token: string };
  return body.token;
}

async function interceptOAuth(page: Page, provider: 'google' | 'facebook', token: string): Promise<void> {
  await page.route(`**/api/int/auth/oauth/${provider}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token, expiresAtEpochSeconds: 1 }),
    });
  });
}

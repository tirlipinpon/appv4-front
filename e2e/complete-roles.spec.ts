import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { environment } from '../projects/admin/src/environments/environment';

const API = 'http://localhost:8080/api/int';
const PASSWORD = environment.devLoginPassword;

const ui = {
  logout: 'account-logout',
  pendingTitle: 'teacher-pending-title',
  loginAlert: 'login-alert',
  signupEmail: 'signup-email',
  signupPassword: 'signup-password',
  signupSubmit: 'signup-submit',
  loginEmail: 'login-email',
  loginPassword: 'login-password',
  loginSubmit: 'login-submit',
  roleParent: 'role-parent',
  roleTeacher: 'role-teacher',
  rolesContinue: 'roles-continue',
} as const;

test('email parent seul arrive sur /parent, et y revient au login suivant', async ({ page }) => {
  const email = uniqueEmail('parent');
  await signupThroughUi(page, email);
  await chooseRoles(page, { parent: true });
  await expect(page).toHaveURL(/\/parent$/);

  await page.getByTestId(ui.logout).click();
  await loginThroughUi(page, email);
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page).not.toHaveURL(/complete-roles/);
});

test('email professeur seul arrive sur la page d attente, et y revient', async ({ page }) => {
  const email = uniqueEmail('teacher');
  await signupThroughUi(page, email);
  await chooseRoles(page, { teacher: true });
  await expect(page).toHaveURL(/\/teacher-pending$/);
  await expect(page.getByTestId(ui.pendingTitle)).toBeVisible();

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

for (const provider of ['google', 'facebook'] as const) {
  test(`${provider} neuf passe par le choix de role puis /parent`, async ({ page, request }) => {
    const email = uniqueEmail(provider);
    const token = await signupByApi(request, email);
    await interceptOAuth(page, provider, token);
    await openOAuthCallback(page, provider);
    await expect(page).toHaveURL(/\/complete-roles$/);
    await chooseRoles(page, { parent: true });
    await expect(page).toHaveURL(/\/parent$/);
  });
}

test('google sur un email deja parent saute la page de choix', async ({ page, request }) => {
  const email = uniqueEmail('linked');
  const fresh = await signupByApi(request, email);
  const chosen = await completeByApi(request, fresh, ['parent']);
  await interceptOAuth(page, 'google', chosen);
  await openOAuthCallback(page, 'google');
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page).not.toHaveURL(/complete-roles/);
});

test('un callback google sans le state du navigateur revient au login', async ({ page }) => {
  await page.goto('/auth/callback/google?code=test-code&state=absent');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId(ui.loginAlert)).toBeVisible();
});

test('un callback google avec un state different revient au login', async ({ page }) => {
  await openOAuthCallback(page, 'google', 'stocke', 'autre');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId(ui.loginAlert)).toBeVisible();
});

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@example.com`;
}

async function signupThroughUi(page: Page, email: string): Promise<void> {
  await page.goto('/signup');
  await page.getByTestId(ui.signupEmail).fill(email);
  await page.getByTestId(ui.signupPassword).fill(PASSWORD);
  await page.getByTestId(ui.signupSubmit).click();
  await expect(page).toHaveURL(/\/complete-roles$/);
}

async function openOAuthCallback(
  page: Page,
  provider: 'google' | 'facebook',
  stored = 'e2e-oauth-state',
  returned = stored,
): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => sessionStorage.setItem(key, value),
    { key: `appv4.oauth.state.${provider}`, value: stored },
  );
  await page.goto(
    `/auth/callback/${provider}?code=test-code&state=${encodeURIComponent(returned)}`,
  );
}

async function loginThroughUi(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId(ui.loginEmail).fill(email);
  await page.getByTestId(ui.loginPassword).fill(PASSWORD);
  await page.getByTestId(ui.loginSubmit).click();
}

async function chooseRoles(page: Page, choice: { parent?: boolean; teacher?: boolean }): Promise<void> {
  if (choice.parent) {
    await page.getByTestId(ui.roleParent).getByRole('checkbox').check();
  }
  if (choice.teacher) {
    await page.getByTestId(ui.roleTeacher).getByRole('checkbox').check();
  }
  await page.getByTestId(ui.rolesContinue).click();
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

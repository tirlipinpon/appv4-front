import { expect, test, type Page } from '@playwright/test';

test('un admin arrive sur la file, valide, et voit la demande acceptée', async ({ page }) => {
  const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  let approved = false;

  await page.route('**/api/int/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: jwt({ roles: ['admin'] }), expiresAtEpochSeconds: 1 }),
    });
  });
  await page.route('**/api/int/admin/teacher-requests', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const item = {
      id: 7,
      email: 'prof@example.com',
      status: approved ? 'approved' : 'pending',
      createdAt,
      reviewedAt: approved ? new Date().toISOString() : undefined,
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ requests: [item] }),
    });
  });
  await page.route('**/api/int/admin/teacher-requests/7/approve', async (route) => {
    approved = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 7,
        email: 'prof@example.com',
        status: 'approved',
        createdAt,
        reviewedAt: new Date().toISOString(),
      }),
    });
  });

  await login(page, 'admin@example.com');
  await expect(page).toHaveURL(/\/admin\/teacher-requests$/);
  await expect(page.getByText('prof@example.com')).toBeVisible();
  await expect(page.getByText(/depuis \d+ h/)).toBeVisible();
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByText('Aucune demande en attente.')).toBeVisible();
  await expect(page.getByText(/Validée le/)).toBeVisible();
  await expect(page.getByText('prof@example.com')).toBeVisible();
});

test('un parent n ouvre pas la file de modération', async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem('admin.jwt', token);
  }, jwt({ activeRole: 'parent', roles: ['parent'] }));
  await page.goto('/admin/teacher-requests');
  await expect(page).toHaveURL(/\/parent$/);
});

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill('Secret1!');
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

function jwt(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `e30.${body}.sig`;
}

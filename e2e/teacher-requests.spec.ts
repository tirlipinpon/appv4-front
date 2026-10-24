import { expect, test, type Page } from '@playwright/test';

test('un admin arrive sur la file, valide, et voit la demande acceptée', async ({ page }) => {
  const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const validatedAt = '2026-10-23T18:00:00.000Z';
  let status: 'pending' | 'approved' | 'revoked' = 'pending';

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
      displayName: 'Prof Test',
      status,
      createdAt,
      reviewedAt: status === 'pending' ? undefined : validatedAt,
      revokedAt: status === 'revoked' ? new Date().toISOString() : undefined,
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ requests: [item] }),
    });
  });
  await page.route('**/api/int/admin/teacher-requests/7/revoke', async (route) => {
    status = 'revoked';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 7,
        email: 'prof@example.com',
        displayName: 'Prof Test',
        status: 'revoked',
        createdAt,
        reviewedAt: validatedAt,
        revokedAt: new Date().toISOString(),
      }),
    });
  });
  await page.route('**/api/int/admin/teacher-requests/7/approve', async (route) => {
    status = 'approved';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 7,
        email: 'prof@example.com',
        displayName: 'Prof Test',
        status: 'approved',
        createdAt,
        reviewedAt: new Date().toISOString(),
      }),
    });
  });

  await login(page, 'admin@example.com');
  await expect(page).toHaveURL(/\/admin\/teacher-requests$/);
  await expect(page.getByText('Prof Test')).toBeVisible();
  await expect(page.getByText('prof@example.com')).toBeVisible();
  await expect(page.getByText(/depuis \d+ h/)).toBeVisible();
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByText('Aucune demande en attente.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Déjà traitées' }).locator('..')).toContainText('Prof Test');
  await expect(page.getByRole('button', { name: 'Révoquer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Re-valider' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Révoquer' }).click();
  await expect(page.getByText('Aucune demande traitée.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Révoquées' }).locator('..')).toContainText('Prof Test');
  await expect(page.getByText(/Validée le/)).toBeVisible();
  await expect(page.getByText(/Révoquée le/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Re-valider' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Révoquer' })).toHaveCount(0);
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
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = Buffer.from(JSON.stringify({ exp, ...payload })).toString('base64url');
  return `e30.${body}.sig`;
}

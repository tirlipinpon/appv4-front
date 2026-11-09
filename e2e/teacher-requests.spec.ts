import { expect, test, type Page } from '@playwright/test';

import { environment } from '../projects/admin/src/environments/environment';

const ui = {
  email: 'login-email',
  password: 'login-password',
  submit: 'login-submit',
  age: 'teacher-request-age',
  approve: 'teacher-request-approve',
  emptyPending: 'teacher-request-empty-pending',
  approved: 'teacher-request-approved',
  revoke: 'teacher-request-revoke',
  reapprove: 'teacher-request-reapprove',
  emptyApproved: 'teacher-request-empty-approved',
  revoked: 'teacher-request-revoked',
  reviewed: 'teacher-request-reviewed',
  revokedOn: 'teacher-request-revoked-on',
} as const;

test.describe('file des demandes professeur', { tag: ['@moderation', '@mock'] }, () => {
  test.describe.configure({ mode: 'parallel' });

test('un admin arrive sur la file, valide, et voit la demande acceptée', async ({ page }) => {
  const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const validatedAt = '2026-10-23T18:00:00.000Z';
  let status: 'pending' | 'approved' | 'revoked' = 'pending';

  await page.route('**/api/int/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ displayName: 'Admin', avatarCode: null }),
    });
  });
  await page.route('**/api/int/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: jwt({ roles: ['admin'] }), expiresAtEpochSeconds: 1 }),
    });
  });
  await page.route(
    (url) => url.pathname === '/api/int/admin/teacher-requests',
    async (route) => {
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
    },
  );
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
  await expect(page.getByTestId('teacher-request-email')).toHaveText('prof@example.com');
  await expect(page.getByTestId(ui.age)).toHaveAttribute('data-age-unit', 'h');
  await page.getByTestId(ui.approve).click();
  await expect(page.getByTestId(ui.emptyPending)).toBeVisible();
  await expect(page.getByTestId(ui.approved)).toContainText('Prof Test');
  await expect(page.getByTestId(ui.revoke)).toBeVisible();
  await expect(page.getByTestId(ui.reapprove)).toHaveCount(0);
  await page.getByTestId(ui.revoke).click();
  await expect(page.getByTestId(ui.emptyApproved)).toBeVisible();
  await expect(page.getByTestId(ui.revoked)).toContainText('Prof Test');
  await expect(page.getByTestId(ui.reviewed)).toBeVisible();
  await expect(page.getByTestId(ui.revokedOn)).toBeVisible();
  await expect(page.getByTestId(ui.reapprove)).toBeVisible();
  await expect(page.getByTestId(ui.revoke)).toHaveCount(0);
});

test('un parent n ouvre pas la file de modération', async ({ page }) => {
  await page.route('**/api/int/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ displayName: 'Parent', roles: ['parent'], teacherRequest: 'none' }),
    });
  });
  await page.addInitScript((token) => {
    sessionStorage.setItem('admin.jwt', token);
  }, jwt({ activeRole: 'parent', roles: ['parent'] }));
  await page.goto('/admin/teacher-requests');
  await expect(page).toHaveURL(/\/parent$/);
});
});

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId(ui.email).fill(email);
  await page.getByTestId(ui.password).fill(environment.devLoginPassword);
  await page.getByTestId(ui.submit).click();
}

function jwt(payload: object): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = Buffer.from(JSON.stringify({ exp, ...payload })).toString('base64url');
  return `e30.${body}.sig`;
}

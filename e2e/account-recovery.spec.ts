import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Récupération de l'identifiant. L'API est simulée : le back n'a pas besoin de tourner.
 * Google et Facebook reviennent dans l'app. Apple n'a pas de page de retour.
 */

const ui = {
  fromForgot: 'forgot-recovery-link',
  name: 'recovery-name',
  phone: 'recovery-phone',
  contact: 'recovery-contact',
  submit: 'recovery-submit',
  mask: 'recovery-mask',
  message: 'recovery-message',
  alert: 'recovery-alert',
  google: 'recovery-google',
  facebook: 'recovery-facebook',
  apple: 'recovery-apple',
} as const;

const MISS = 'Aucun compte ne correspond à ces informations.';
const INACTIVE = 'Ce compte est inactif.';
const WAIT = "Trop d'essais. Réessaie dans un moment.";
const FAILED = 'La recherche n’a pas abouti.';

test.describe("Récupération de l'identifiant", { tag: ['@auth', '@mock'] }, () => {
  test.describe.configure({ mode: 'parallel' });

  test('le lien du mot de passe oublié ouvre le formulaire', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByTestId(ui.fromForgot).click();
    await expect(page).toHaveURL(/\/account-recovery$/);
    await expect(page.getByTestId(ui.name)).toBeVisible();
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
    await expect(page.getByText('parcours à venir')).toHaveCount(0);
  });

  test('un mail invalide ne lance pas la recherche', async ({ page }) => {
    let searches = 0;
    await page.route('**/api/int/auth/recover-identifier', async (route) => {
      searches += 1;
      await route.abort();
    });
    await open(page);
    await fill(page, { contact: 'pas-un-email' });
    await expect(page.getByTestId(ui.submit)).toBeDisabled();
    await page.getByTestId(ui.submit).click({ force: true });
    expect(searches).toBe(0);
  });

  test('un seul compte actif montre le masque et ne connecte pas', async ({ page }) => {
    await answer(page, 200, { maskedEmail: 'ma***@ecole.be' });
    await open(page);
    await fill(page);
    await page.getByTestId(ui.submit).click();
    await expect(page.getByTestId(ui.mask)).toHaveText('ma***@ecole.be');
    await expect(page.getByTestId(ui.message)).toHaveCount(0);
    await expect(page).toHaveURL(/\/account-recovery$/);
    expect(await page.evaluate(() => sessionStorage.getItem('admin.jwt'))).toBeNull();
  });

  test('un seul compte inactif annonce le compte sans masque', async ({ page }) => {
    await answer(page, 200, { message: INACTIVE });
    await open(page);
    await fill(page);
    await page.getByTestId(ui.submit).click();
    await expect(page.getByTestId(ui.message)).toHaveText(INACTIVE);
    await expect(page.getByTestId(ui.mask)).toHaveCount(0);
    await expect(page).toHaveURL(/\/account-recovery$/);
  });

  test('zéro compte et plusieurs comptes montrent la même phrase', async ({ page }) => {
    await answer(page, 200, { message: MISS });
    await open(page);
    await fill(page);
    await page.getByTestId(ui.submit).click();
    await expect(page.getByTestId(ui.message)).toHaveText(MISS);
    await expect(page.getByTestId(ui.mask)).toHaveCount(0);

    await page.getByTestId(ui.submit).click();
    await expect(page.getByTestId(ui.message)).toHaveText(MISS);
    await expect(page.getByTestId(ui.mask)).toHaveCount(0);
  });

  test('trop d essais affiche la phrase reçue', async ({ page }) => {
    await answer(page, 429, { message: WAIT });
    await open(page);
    await fill(page);
    await page.getByTestId(ui.submit).click();
    await expect(page.getByTestId(ui.alert)).toHaveText(WAIT);
    await expect(page.getByTestId(ui.mask)).toHaveCount(0);
  });

  test('une réponse sans phrase dit que la recherche n a pas abouti', async ({ page }) => {
    await answer(page, 401, { error: 'Unauthorized' });
    await open(page);
    await fill(page);
    await page.getByTestId(ui.submit).click();
    await expect(page.getByTestId(ui.alert)).toHaveText(FAILED);
    expect(await page.evaluate(() => sessionStorage.getItem('admin.jwt'))).toBeNull();
  });

  for (const provider of ['google', 'facebook'] as const) {
    test(`${provider} revient dans l app sans lancer la recherche`, async ({ page }) => {
      let searches = 0;
      await page.route('**/api/int/auth/recover-identifier', async (route) => {
        searches += 1;
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      });
      await page.route('**/api/int/auth/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ displayName: 'Parent', avatarCode: null }),
        });
      });
      await page.route('**/api/int/auth/spaces', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ roles: ['parent'], teacherRequest: 'none' }),
        });
      });
      await page.route('**/api/int/parent/**', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      });
      await page.route(`**/api/int/auth/oauth/${provider}/authorize-url**`, async (route) => {
        const state = 'e2e-oauth-state';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authorizationUrl: `/auth/callback/${provider}?code=test-code&state=${state}`,
            state,
          }),
        });
      });
      await page.route(`**/api/int/auth/oauth/${provider}`, async (route) => {
        if (route.request().method() !== 'POST') {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: jwt({ activeRole: 'parent', roles: ['parent'] }),
            expiresAtEpochSeconds: 1,
          }),
        });
      });

      await open(page);
      await page.getByTestId(provider === 'google' ? ui.google : ui.facebook).click();
      await expect(page).toHaveURL(/\/parent$/);
      expect(searches).toBe(0);
    });
  }

  test('Apple ouvre l adresse reçue et ne lance pas la recherche', async ({ page }) => {
    let searches = 0;
    await page.route('**/api/int/auth/recover-identifier', async (route) => {
      searches += 1;
      await route.abort();
    });
    await page.route('**/api/int/auth/oauth/apple/authorize-url**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authorizationUrl: '/login?oauth=apple',
          state: 'e2e-oauth-state',
        }),
      });
    });

    await open(page);
    await page.getByTestId(ui.apple).click();
    await expect(page).toHaveURL(/\/login\?oauth=apple$/);
    expect(searches).toBe(0);
  });
});

async function open(page: Page): Promise<void> {
  await page.goto('/account-recovery');
}

async function fill(page: Page, over: { contact?: string } = {}): Promise<void> {
  await page.getByTestId(ui.name).fill('Elodie Martin');
  await page.getByTestId(ui.phone).fill('0470123456');
  await page.getByTestId(ui.contact).fill(over.contact ?? 'marue@ecole.be');
}

async function answer(page: Page, status: number, body: unknown): Promise<void> {
  await page.route('**/api/int/auth/recover-identifier', async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

function jwt(payload: object): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = Buffer.from(JSON.stringify({ exp, ...payload })).toString('base64url');
  return `e30.${body}.sig`;
}

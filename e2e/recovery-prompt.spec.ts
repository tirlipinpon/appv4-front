import { expect, test, type Page } from '@playwright/test';

/**
 * Sollicitation à la première entrée. L'API est simulée.
 * « Qui es-tu ? » n'est pas redirigé.
 */

const ui = {
  sentence: 'recovery-prompt-sentence',
  name: 'recovery-prompt-name',
  phone: 'recovery-prompt-phone',
  contact: 'recovery-prompt-contact',
  skip: 'recovery-prompt-skip',
  save: 'recovery-prompt-save',
  alert: 'recovery-prompt-alert',
  roleParent: 'role-parent',
  rolesContinue: 'roles-continue',
} as const;

const SENTENCE = 'Ces informations serviront à retrouver ton email de connexion si tu le perds.';

test.describe('Sollicitation de contact', { tag: ['@auth', '@mock'] }, () => {
  test.describe.configure({ mode: 'parallel' });

  test('qui es-tu reste affiché même si la question est due', async ({ page }) => {
    await page.addInitScript((token) => sessionStorage.setItem('admin.jwt', token), parentToken(false));
    await mockMe(page, true);
    await page.goto('/complete-roles');
    await expect(page).toHaveURL(/\/complete-roles$/);
    await expect(page.getByTestId(ui.sentence)).toHaveCount(0);
  });

  test('un espace redirige vers la question, passer entre ensuite', async ({ page }) => {
    await page.addInitScript((token) => sessionStorage.setItem('admin.jwt', token), parentToken(true));
    let asked = false;
    await page.route('**/api/int/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          asked
            ? { displayName: 'Anne', askRecoveryContact: false }
            : { displayName: 'Anne', askRecoveryContact: true, recoveryPrompt: SENTENCE },
        ),
      });
    });
    await page.route('**/api/int/auth/recovery-prompt', async (route) => {
      asked = true;
      await route.fulfill({ status: 204, body: '' });
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

    await page.goto('/parent');
    await expect(page).toHaveURL(/\/recovery-prompt$/);
    await expect(page.getByTestId(ui.sentence)).toHaveText(SENTENCE);
    await page.getByTestId(ui.skip).click();
    await expect(page).toHaveURL(/\/parent$/);
  });

  test('un téléphone refusé reste sur la question', async ({ page }) => {
    await page.addInitScript((token) => sessionStorage.setItem('admin.jwt', token), parentToken(true));
    await mockMe(page, true);
    await page.route('**/api/int/auth/recovery-prompt', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: "Le numéro de téléphone n'est pas valide." }),
      });
    });

    await page.goto('/recovery-prompt');
    await page.getByTestId(ui.phone).fill('12');
    await page.getByTestId(ui.save).click();
    await expect(page.getByTestId(ui.alert)).toHaveText("Le numéro de téléphone n'est pas valide.");
    await expect(page).toHaveURL(/\/recovery-prompt$/);
  });

  test('une fiche déjà complète entre sans question', async ({ page }) => {
    await page.addInitScript((token) => sessionStorage.setItem('admin.jwt', token), parentToken(true));
    await mockMe(page, false);
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

    await page.goto('/parent');
    await expect(page).toHaveURL(/\/parent$/);
    await expect(page.getByTestId(ui.sentence)).toHaveCount(0);
  });
});

async function mockMe(page: Page, ask: boolean): Promise<void> {
  await page.route('**/api/int/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        ask
          ? { displayName: 'Anne', askRecoveryContact: true, recoveryPrompt: SENTENCE }
          : { displayName: 'Anne', askRecoveryContact: false },
      ),
    });
  });
}

function parentToken(withRole: boolean): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payload = withRole
    ? { exp, activeRole: 'parent', roles: ['parent'] }
    : { exp, roles: [] };
  return `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
}

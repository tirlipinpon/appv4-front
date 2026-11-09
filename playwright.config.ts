import { defineConfig, devices } from '@playwright/test';

/**
 * Parcours admin (SCRUM-155). Le serveur Angular (:4201) doit tourner.
 * Le back (:8080) n'est requis que pour le tag @auth.
 * Les autres suites sont simulées (@mock) et tournent en parallèle dans leur fichier.
 * Exemples : npm run e2e:mock, npx playwright test --grep @parent
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4201',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

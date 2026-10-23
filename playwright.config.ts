import { defineConfig, devices } from '@playwright/test';

/**
 * Parcours admin (SCRUM-155). Le serveur Angular (:4201) et le back (:8080)
 * doivent déjà tourner. Google et Facebook sont interceptés dans les tests.
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

/**
 * Régénère projects/<app>/src/app/core/api/schema.ts depuis
 * ../appv4-back/openapi/openapi.json (SCRUM-148).
 *
 * Utilise npx (pas de dépendance npm) pour éviter le peer TS5 vs Angular TS6.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const openapi = resolve(root, '../appv4-back/openapi/openapi.json');
const apps = ['admin', 'learning'];

if (!existsSync(openapi)) {
  console.error(
    `Manquant: ${openapi}\n` +
      'Merge la PR back qui versionne openapi.json, ou lance OpenApiContractExportTest.',
  );
  process.exit(1);
}

for (const app of apps) {
  const out = resolve(root, `projects/${app}/src/app/core/api/schema.ts`);
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(
    'npx',
    ['--yes', 'openapi-typescript@7.13.0', openapi, '-o', out],
    { stdio: 'inherit', cwd: root, shell: true },
  );
  console.log(`OK ${app} → ${out}`);
}

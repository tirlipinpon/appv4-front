/**
 * Régénère projects/<app>/src/app/core/api/schema.ts depuis
 * ../appv4-back/openapi/openapi.json (SCRUM-148).
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
      'Lance le back (OpenApiContractExportTest) ou merge la PR qui versionne openapi.json.',
  );
  process.exit(1);
}

const bin = resolve(root, 'node_modules/openapi-typescript/bin/cli.js');

for (const app of apps) {
  const out = resolve(root, `projects/${app}/src/app/core/api/schema.ts`);
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(process.execPath, [bin, openapi, '-o', out], { stdio: 'inherit' });
  console.log(`OK ${app} → ${out}`);
}

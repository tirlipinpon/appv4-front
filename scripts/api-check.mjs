/**
 * Régénère schema.ts puis échoue s'il y a un diff sur les fichiers déjà trackés.
 */
import { execFileSync, execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generate = resolve(root, 'scripts/api-generate.mjs');
const schemas = [
  'projects/admin/src/app/core/api/schema.ts',
  'projects/learning/src/app/core/api/schema.ts',
];

execFileSync(process.execPath, [generate], { stdio: 'inherit', cwd: root });

let dirty = '';
try {
  dirty = execSync(`git diff -- ${schemas.join(' ')}`, {
    cwd: root,
    encoding: 'utf8',
  }).trim();
} catch {
  process.exit(0);
}

if (dirty) {
  console.error(
    'schema.ts désynchronisé du contrat OpenAPI.\n' +
      'Exécute `npm run api:generate`, adapte les data-access, commit.\n',
  );
  process.exit(1);
}

console.log('api:check OK — schema.ts à jour.');

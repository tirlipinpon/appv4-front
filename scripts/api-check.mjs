/**
 * Régénère schema.ts puis échoue s'il y a un diff sur les fichiers déjà trackés.
 *
 * Trois résultats, pour ne pas confondre un contrat à jour avec un contrôle raté :
 * - 0 : schémas identiques au contrat
 * - 1 : git diff a vu un écart (il faut régénérer et committer)
 * - 2 : git diff n'a pas pu s'exécuter (le contrôle n'a pas eu lieu)
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generate = resolve(root, 'scripts/api-generate.mjs');
const schemas = [
  'projects/admin/src/app/core/api/schema.ts',
  'projects/learning/src/app/core/api/schema.ts',
];

const OUT_OF_DATE =
  'schema.ts désynchronisé du contrat OpenAPI.\n' +
  'Exécute `npm run api:generate`, adapte les data-access, commit.\n';

const UP_TO_DATE = 'api:check OK — schema.ts à jour.';

/**
 * @param {{ ok: boolean, dirty?: string, detail?: string }} diffResult
 * @returns {{ code: number, message: string }}
 */
export function evaluateSchemaDiff(diffResult) {
  if (!diffResult.ok) {
    const detail = String(diffResult.detail ?? '').trim();
    return {
      code: 2,
      message:
        "api:check : git diff a échoué, la synchro de schema.ts n'est pas vérifiée." +
        (detail ? `\n${detail}` : '') +
        '\n',
    };
  }

  if (diffResult.dirty) {
    return { code: 1, message: OUT_OF_DATE };
  }

  return { code: 0, message: UP_TO_DATE };
}

/**
 * Lance `git diff` sur les schema.ts. Un écart reste un succès de la commande :
 * seul un échec d'exécution (dépôt illisible, git absent) renvoie ok: false.
 *
 * @param {string} cwd
 * @param {string[]} schemaPaths
 */
export function readSchemaDiff(cwd, schemaPaths) {
  try {
    const dirty = execFileSync('git', ['diff', '--', ...schemaPaths], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, dirty: dirty.trim() };
  } catch (error) {
    const stderr = Buffer.isBuffer(error.stderr)
      ? error.stderr.toString('utf8')
      : String(error.stderr ?? '');
    const detail = stderr.trim() || String(error.message ?? '').trim() || 'git diff a échoué';
    return { ok: false, detail };
  }
}

/**
 * @param {{ generate: () => void, readDiff: () => { ok: boolean, dirty?: string, detail?: string } }} deps
 */
export function runApiCheck({ generate: generateSchemas, readDiff }) {
  generateSchemas();
  return evaluateSchemaDiff(readDiff());
}

function main() {
  const result = runApiCheck({
    generate: () => {
      execFileSync(process.execPath, [generate], { stdio: 'inherit', cwd: root });
    },
    readDiff: () => readSchemaDiff(root, schemas),
  });

  if (result.code === 0) {
    console.log(result.message);
  } else {
    console.error(result.message);
  }
  process.exit(result.code);
}

const entry = process.argv[1];
if (entry && resolve(entry) === resolve(fileURLToPath(import.meta.url))) {
  main();
}

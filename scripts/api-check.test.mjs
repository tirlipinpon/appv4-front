import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { evaluateSchemaDiff, readSchemaDiff, runApiCheck } from './api-check.mjs';

describe('api:check', () => {
  it('schémas à jour : code 0', () => {
    const result = runApiCheck({
      generate: () => {},
      readDiff: () => ({ ok: true, dirty: '' }),
    });

    assert.equal(result.code, 0);
    assert.match(result.message, /à jour/);
  });

  it('diff de schéma : code 1, distinct du succès', () => {
    const result = runApiCheck({
      generate: () => {},
      readDiff: () => ({ ok: true, dirty: 'diff --git a/schema.ts' }),
    });

    assert.equal(result.code, 1);
    assert.match(result.message, /désynchronisé/);
    assert.doesNotMatch(result.message, /à jour/);
  });

  it('git diff en échec : code non nul et le diagnostic git', () => {
    const dir = mkdtempSync(join(tmpdir(), 'api-check-'));
    const diff = readSchemaDiff(dir, ['schema.ts']);
    const result = evaluateSchemaDiff(diff);

    assert.equal(diff.ok, false);
    assert.match(diff.detail, /not a git repository|fatal/i);
    assert.notEqual(result.code, 0);
    assert.equal(result.code, 2);
    assert.match(result.message, /git diff a échoué/);
    assert.match(result.message, /not a git repository|fatal/i);
  });
});

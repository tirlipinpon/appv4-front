import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const tokens = JSON.parse(readFileSync(new URL('../design/tokens.json', import.meta.url), 'utf8'));
const css = readFileSync(new URL('../projects/admin/src/styles/tokens.scss', import.meta.url), 'utf8');
const theme = readFileSync(new URL('../projects/admin/src/styles.scss', import.meta.url), 'utf8');

const declared = {
  '--app-primary': tokens.color.primary,
  '--app-on-primary': tokens.color.onPrimary,
  '--app-primary-soft': tokens.color.primarySoft,
  '--app-surface': tokens.color.surface,
  '--app-surface-muted': tokens.color.surfaceMuted,
  '--app-surface-card': tokens.color.surfaceCard,
  '--app-text': tokens.color.text,
  '--app-text-muted': tokens.color.textMuted,
  '--app-error': tokens.color.error,
  '--app-success': tokens.color.success,
  '--app-outline': tokens.color.outline,
  '--app-space-1': `${tokens.space['1']}px`,
  '--app-space-2': `${tokens.space['2']}px`,
  '--app-space-3': `${tokens.space['3']}px`,
  '--app-space-4': `${tokens.space['4']}px`,
  '--app-radius-card': `${tokens.radius.card}px`,
  '--app-radius-pill': `${tokens.radius.pill}px`,
  '--app-content-form': `${tokens.content.formRem}rem`,
  '--app-content-list': `${tokens.content.listRem}rem`,
};

test('les variables CSS admin reprennent design/tokens.json', () => {
  for (const [name, value] of Object.entries(declared)) {
    assert.match(css, new RegExp(`${name}:\\s*${escapeRegExp(value)};`));
  }
  assert.match(css, new RegExp(`--app-font:\\s*${escapeRegExp(tokens.font.family)};`));
});

test('le thème Material reprend la couleur primaire du contrat', () => {
  assert.match(theme, new RegExp(`primary:\\s*${tokens.color.primary}`));
  assert.match(theme, new RegExp(`on-primary:\\s*${tokens.color.onPrimary}`));
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

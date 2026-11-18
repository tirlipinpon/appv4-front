import { iconSearchQuery } from './fr-icon-query';

describe('iconSearchQuery', () => {
  it('traduit les matières scolaires FR vers l’anglais Iconify', () => {
    expect(iconSearchQuery('chimie')).toContain('chemistry');
    expect(iconSearchQuery('Mathématiques')).toContain('math');
    expect(iconSearchQuery('livre')).toBe('book');
  });

  it('laisse passer une requête déjà anglaise', () => {
    expect(iconSearchQuery('chemistry')).toBe('chemistry');
  });
});

import type { ParentSchoolOption } from '../../core/api/api-models';
import {
  AGE_INVALID,
  PIN_FORMAT,
  PIN_MISMATCH,
  ageError,
  digitsOnly,
  pinError,
  suggestSchools,
} from './child-entry';

describe('saisie enfant', () => {
  it('ne garde que les chiffres, quatre au plus pour le code', () => {
    expect(digitsOnly('abcd')).toBe('');
    expect(digitsOnly('48a1', 4)).toBe('481');
    expect(digitsOnly('7 ans')).toBe('7');
    expect(digitsOnly('sept')).toBe('');
    expect(digitsOnly('48219', 4)).toBe('4821');
  });

  it('refuse un code trop court avant un code différent', () => {
    expect(pinError('482', '482')).toBe(PIN_FORMAT);
    expect(pinError('4821', '482')).toBe(PIN_FORMAT);
    expect(pinError('4821', '4822')).toBe(PIN_MISMATCH);
    expect(pinError('4821', '4821')).toBeNull();
  });

  it('garde l’âge entre 2 et 18', () => {
    expect(ageError('')).toBe(AGE_INVALID);
    expect(ageError('1')).toBe(AGE_INVALID);
    expect(ageError('19')).toBe(AGE_INVALID);
    expect(ageError('2')).toBeNull();
    expect(ageError('18')).toBeNull();
    expect(ageError('7')).toBeNull();
  });

  const france = (id: number, name: string): ParentSchoolOption => ({
    id,
    name,
    country: 'France',
    grades: ['6e'],
  });

  it('propose au plus quarante écoles du pays, après deux lettres, sans tenir compte des majuscules', () => {
    const schools = [
      ...Array.from({ length: 45 }, (_, index) => france(index + 1, `Lycée ${index}`)),
      { id: 90, name: 'École communale', country: 'Belgique', grades: ['1re primaire'] },
    ];

    expect(suggestSchools(schools, 'France', 'l')).toEqual([]);
    expect(suggestSchools(schools, null, 'lycee')).toEqual([]);
    const found = suggestSchools(schools, 'France', 'LYCÉE');
    expect(found).toHaveSize(40);
    expect(found.every((school) => school.country === 'France')).toBeTrue();
    expect(suggestSchools(schools, 'Belgique', 'école').map((school) => school.id)).toEqual([90]);
  });
});

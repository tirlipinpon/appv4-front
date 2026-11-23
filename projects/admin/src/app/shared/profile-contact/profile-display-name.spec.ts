import {
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_NAME_REQUIRED,
  PROFILE_NAME_TOO_LONG,
  profileDisplayNameProblem,
} from './profile-display-name';

describe('profileDisplayNameProblem', () => {
  it('refuse un nom vide', () => {
    expect(profileDisplayNameProblem('')).toBe(PROFILE_NAME_REQUIRED);
  });

  it('refuse un nom trop long', () => {
    expect(profileDisplayNameProblem('x'.repeat(PROFILE_NAME_MAX_LENGTH + 1))).toBe(PROFILE_NAME_TOO_LONG);
  });

  it('accepte un nom dans les bornes', () => {
    expect(profileDisplayNameProblem('Camille')).toBeNull();
    expect(profileDisplayNameProblem('x'.repeat(PROFILE_NAME_MAX_LENGTH))).toBeNull();
  });
});

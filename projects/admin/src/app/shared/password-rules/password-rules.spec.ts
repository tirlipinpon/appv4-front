import { evaluatePasswordRules, isPasswordValid } from './password-rules';

describe('password-rules', () => {
  it('rejects weak passwords', () => {
    expect(isPasswordValid('short')).toBe(false);
    expect(isPasswordValid('alllowercase1!')).toBe(false);
    expect(isPasswordValid('ALLUPPERCASE1!')).toBe(false);
    expect(isPasswordValid('NoDigits!!')).toBe(false);
    expect(isPasswordValid('NoSpecial1')).toBe(false);
  });

  it('accepts Maison1!', () => {
    expect(isPasswordValid('Maison1!')).toBe(true);
    const rules = evaluatePasswordRules('Maison1!');
    expect(rules.every((r) => r.ok)).toBe(true);
  });
});

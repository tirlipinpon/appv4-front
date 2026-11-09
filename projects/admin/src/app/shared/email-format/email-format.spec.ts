import { EMAIL_FORMAT_MESSAGE, isPlausibleEmail } from './email-format';

describe('isPlausibleEmail', () => {
  it('accepte une adresse simple', () => {
    expect(isPlausibleEmail('ada@exemple.com')).toBeTrue();
    expect(isPlausibleEmail('  ada@exemple.com  ')).toBeTrue();
  });

  it('refuse les adresses manifestement invalides', () => {
    expect(isPlausibleEmail('')).toBeFalse();
    expect(isPlausibleEmail('@')).toBeFalse();
    expect(isPlausibleEmail('a@')).toBeFalse();
    expect(isPlausibleEmail('a@b')).toBeFalse();
    expect(isPlausibleEmail('a b@exemple.com')).toBeFalse();
    expect(EMAIL_FORMAT_MESSAGE.length).toBeGreaterThan(0);
  });
});

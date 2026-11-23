import { linksForSex } from './child-links';

describe('linksForSex', () => {
  it('ne propose au garçon que frère, demi-frère, jumeau et cousin', () => {
    expect(linksForSex('GARCON').map((item) => item.label)).toEqual([
      'Frère',
      'Demi-frère',
      'Jumeau',
      'Cousin',
    ]);
  });

  it('ne propose à la fille que sœur, demi-sœur, jumelle et cousine', () => {
    expect(linksForSex('FILLE').map((item) => item.code)).toEqual([
      'SOEUR',
      'DEMI_SOEUR',
      'JUMELLE',
      'COUSINE',
    ]);
  });

  it('propose au non genré un code par famille, au libellé neutre', () => {
    expect(linksForSex('NON_GENRE')).toEqual([
      { code: 'FRERE', label: 'Frère/sœur' },
      { code: 'DEMI_FRERE', label: 'Demi-frère/sœur' },
      { code: 'JUMEAU', label: 'Jumeau/jumelle' },
      { code: 'COUSIN', label: 'Cousin/cousine' },
    ]);
  });
});

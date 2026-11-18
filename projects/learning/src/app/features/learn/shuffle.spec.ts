import { randomTrueFalseOrder, shuffleCopy } from './shuffle';

describe('shuffleCopy', () => {
  it('conserve les éléments et la longueur', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffleCopy(input);
    expect(out).toHaveSize(5);
    expect(out.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it('peut produire un ordre différent sur plusieurs tirages', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      seen.add(shuffleCopy(input).join(','));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('randomTrueFalseOrder', () => {
  it('renvoie exactement vrai et faux une fois chacun', () => {
    const order = randomTrueFalseOrder();
    expect(order).toHaveSize(2);
    expect(new Set(order)).toEqual(new Set([true, false]));
  });
});

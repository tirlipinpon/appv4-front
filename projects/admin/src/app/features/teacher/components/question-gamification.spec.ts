import {
  draftFromItem,
  gamificationInput,
  levelsFromCatalog,
  withAttempts,
  withCustomize,
  withDifficulty,
  withPoint,
} from './question-gamification';

const levels = levelsFromCatalog([
  { code: 'facile', label: 'Facile', pointsByAttempt: [10, 5, 2, 1, 1] },
  { code: 'modere', label: 'Modéré', pointsByAttempt: [20, 10, 5, 2, 1] },
  { code: 'sans-points', label: 'Incomplet' },
]);

const easy = {
  maxAttempts: 1,
  difficulty: 'facile',
  difficultyLabel: 'Facile',
  customizePoints: false,
  gamificationDisabled: false,
  points: [10],
};

describe('question-gamification', () => {
  it('drops a difficulty the API did not finish', () => {
    expect(levels.map((level) => level.code)).toEqual(['facile', 'modere']);
  });

  it('refuses an item that does not carry its label and points', () => {
    expect(draftFromItem({ maxAttempts: 1, difficulty: 'facile', points: [10] })).toBeNull();
    expect(draftFromItem(easy)?.difficultyLabel).toBe('Facile');
  });

  it('follows the scale when attempts or difficulty change', () => {
    const two = withAttempts(easy, 2, levels);
    expect(two.points).toEqual([10, 5]);
    const moderate = withDifficulty(two, levels[1]);
    expect(moderate.difficultyLabel).toBe('Modéré');
    expect(moderate.points).toEqual([20, 10]);
  });

  it('raises the points when the difficulty rises, even if they are customized', () => {
    const custom = withCustomize(withAttempts(easy, 4, levels), true, levels);
    expect(withDifficulty(custom, levels[1]).points).toEqual([20, 10, 5, 2]);
  });

  it('fills each new custom attempt with the scale point', () => {
    const custom = withCustomize(withPoint(easy, 0, '99'), true, levels);
    expect(withAttempts(custom, 4, levels).points).toEqual([99, 5, 2, 1]);
  });

  it('keeps typed points and sends only a complete custom list', () => {
    const custom = withPoint(withCustomize(withAttempts(easy, 2, levels), true, levels), 1, '');
    expect(custom.points).toEqual([10, null]);
    expect(gamificationInput(custom)?.points).toEqual([10]);
    expect(gamificationInput(withCustomize(custom, false, levels))?.points).toBeUndefined();
  });
});

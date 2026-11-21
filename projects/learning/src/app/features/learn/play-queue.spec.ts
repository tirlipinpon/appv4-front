import { nextQuestionId, readPlayQueue } from './play-queue';

describe('play queue', () => {
  it('garde la file de la leçon ouverte', () => {
    expect(readPlayQueue({ source: 'lesson', queue: [11, 12] })).toEqual({
      source: 'lesson',
      queue: [11, 12],
    });
    expect(nextQuestionId([11, 12], 11)).toBe(12);
    expect(nextQuestionId([11, 12], 12)).toBeNull();
  });

  it('une arrivée sans file ne propose pas de suivante', () => {
    expect(readPlayQueue(null)).toEqual({ source: 'questions', queue: [] });
    expect(nextQuestionId([], 11)).toBeNull();
  });
});

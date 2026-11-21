export interface PlayQueueState {
  source: 'lesson' | 'questions';
  queue: number[];
}

export function readPlayQueue(state: unknown): PlayQueueState {
  if (state == null || typeof state !== 'object') {
    return { source: 'questions', queue: [] };
  }
  const raw = state as { source?: unknown; queue?: unknown };
  const queue = Array.isArray(raw.queue)
    ? raw.queue.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id))
    : [];
  return {
    source: raw.source === 'lesson' ? 'lesson' : 'questions',
    queue,
  };
}

export function nextQuestionId(queue: number[], currentId: number): number | null {
  const index = queue.indexOf(currentId);
  if (index < 0 || index + 1 >= queue.length) {
    return null;
  }
  return queue[index + 1];
}

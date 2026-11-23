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

export function nextQuestionId(
  queue: number[],
  currentId: number,
  stillToValidate?: number[],
): number | null {
  const index = queue.indexOf(currentId);
  if (index >= 0 && index + 1 < queue.length) {
    return queue[index + 1];
  }
  if (stillToValidate == null || stillToValidate.length === 0) {
    return null;
  }
  const remaining = new Set(stillToValidate);
  const later = queue.filter((id, position) => position > index && id !== currentId && remaining.has(id));
  if (later.length > 0) {
    return later[0];
  }
  const earlier = queue.find((id) => id !== currentId && remaining.has(id));
  return earlier ?? null;
}

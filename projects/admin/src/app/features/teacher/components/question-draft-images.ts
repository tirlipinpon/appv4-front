import type { ImageSource, LinkDraft, PairDraft, PieceImageDraft } from './question-form.model';

/** Remplit les octets manquants des pièces encore présentes dans le brouillon. */
function mergeRows<T extends ImageSource>(
  draft: T[],
  detail: T[],
  merge: (row: T, loaded: T) => T,
): T[] {
  if (detail.length === 0) {
    return draft;
  }
  const byId = new Map<number, T>();
  for (const row of detail) {
    if (row.sourceId != null) {
      byId.set(row.sourceId, row);
    }
  }
  return draft.map((row) => {
    const loaded = row.sourceId == null ? undefined : byId.get(row.sourceId);
    return loaded ? merge(row, loaded) : row;
  });
}

export function mergePieceImages<T extends PieceImageDraft>(draft: T[], detail: T[]): T[] {
  return mergeRows(draft, detail, (row, loaded) =>
    row.hasImage && row.imageDataUrl === undefined && loaded.imageDataUrl
      ? { ...row, imageDataUrl: loaded.imageDataUrl }
      : row,
  );
}

export function mergePairImages(draft: PairDraft[], detail: PairDraft[]): PairDraft[] {
  return mergeRows(draft, detail, (row, loaded) => ({
    ...row,
    questionImageDataUrl: row.questionImageDataUrl ?? (row.questionHasImage ? loaded.questionImageDataUrl : undefined),
    answerImageDataUrl: row.answerImageDataUrl ?? (row.answerHasImage ? loaded.answerImageDataUrl : undefined),
  }));
}

export function mergeLinkImages(draft: LinkDraft[], detail: LinkDraft[]): LinkDraft[] {
  return mergeRows(draft, detail, (row, loaded) => ({
    ...row,
    leftImageDataUrl: row.leftImageDataUrl ?? (row.leftHasImage ? loaded.leftImageDataUrl : undefined),
    rightImageDataUrl: row.rightImageDataUrl ?? (row.rightHasImage ? loaded.rightImageDataUrl : undefined),
  }));
}

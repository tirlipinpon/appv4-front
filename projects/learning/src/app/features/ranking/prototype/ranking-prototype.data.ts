/**
 * THROWAWAY PROTOTYPE. Not the feature.
 * Three layouts of Classement, switchable with ?variant= on /ranking.
 */

export interface ProtoScope {
  code: string;
  label: string;
}

export interface ProtoCard {
  place: number;
  firstName: string;
  xp: number;
  face: string;
  mine: boolean;
  pinned: boolean;
}

export interface ProtoView {
  scope: string;
  scopes: readonly ProtoScope[];
  groupLabel: string;
  phrase: string | null;
  cards: readonly ProtoCard[];
}

export type ProtoScenario = 'normal' | 'ecole' | 'cache' | 'seul';

export const PROTO_SCOPES: readonly ProtoScope[] = [
  { code: 'classe', label: 'Ma classe' },
  { code: 'annee', label: 'Mon année' },
  { code: 'pays', label: 'Mon pays' },
  { code: 'tous', label: 'Tout le monde' },
  { code: 'age', label: 'Mon âge' },
];

const CLASSE: readonly ProtoCard[] = [
  { place: 1, firstName: 'Lina', xp: 120, face: '🦊', mine: false, pinned: false },
  { place: 2, firstName: 'Akira', xp: 90, face: '🐻', mine: true, pinned: false },
  { place: 2, firstName: 'Noé', xp: 90, face: '🐼', mine: false, pinned: false },
  { place: 4, firstName: 'Mila', xp: 70, face: '🐱', mine: false, pinned: false },
  { place: 5, firstName: 'Sami', xp: 40, face: '🐸', mine: false, pinned: false },
];

const PAYS: readonly ProtoCard[] = [
  { place: 1, firstName: 'Lina', xp: 120, face: '🦊', mine: false, pinned: false },
  { place: 2, firstName: 'Inès', xp: 110, face: '🦉', mine: false, pinned: false },
  { place: 3, firstName: 'Noé', xp: 90, face: '🐼', mine: false, pinned: false },
  { place: 4, firstName: 'Mila', xp: 70, face: '🐱', mine: false, pinned: false },
  { place: 5, firstName: 'Sami', xp: 40, face: '🐸', mine: false, pinned: false },
  { place: 6, firstName: 'Léa', xp: 36, face: '🦊', mine: false, pinned: false },
  { place: 7, firstName: 'Adam', xp: 30, face: '🐻', mine: false, pinned: false },
  { place: 8, firstName: 'Nina', xp: 22, face: '🐱', mine: false, pinned: false },
  { place: 9, firstName: 'Tom', xp: 18, face: '🐼', mine: false, pinned: false },
  { place: 10, firstName: 'Eva', xp: 12, face: '🦉', mine: false, pinned: false },
  { place: 14, firstName: 'Akira', xp: 4, face: '🐻', mine: true, pinned: true },
];

function groupLabel(scope: string): string {
  if (scope === 'classe') return 'CE1 · École Nouvelle';
  if (scope === 'annee') return 'CE1';
  if (scope === 'pays') return 'Belgique';
  if (scope === 'age') return '8 ans';
  return 'Tout le monde';
}

function members(scope: string): readonly ProtoCard[] {
  if (scope === 'pays' || scope === 'tous') return PAYS;
  if (scope === 'age') return CLASSE.slice(0, 1).map((card) => ({ ...card, place: 1, mine: false })).concat([
    { place: 2, firstName: 'Akira', xp: 90, face: '🐻', mine: true, pinned: false },
  ]);
  return CLASSE;
}

export function buildRanking(scope: string, scenario: ProtoScenario): ProtoView {
  const base = {
    scope,
    scopes: PROTO_SCOPES,
    groupLabel: groupLabel(scope),
  };
  if (scenario === 'ecole' && (scope === 'classe' || scope === 'pays')) {
    return { ...base, groupLabel: '', phrase: 'Il te faut une école pour ce classement.', cards: [] };
  }
  if (scenario === 'seul') {
    return {
      ...base,
      phrase: null,
      cards: [{ place: 1, firstName: 'Akira', xp: 90, face: '🐻', mine: true, pinned: false }],
    };
  }
  const cards = members(scope);
  if (scenario === 'cache') {
    return {
      ...base,
      phrase: "Tu n'es pas dans ce classement.",
      cards: cards.filter((card) => !card.mine),
    };
  }
  return { ...base, phrase: null, cards };
}

export function rankingStateLine(view: ProtoView): string {
  const mine = view.cards.find((card) => card.mine);
  const place = mine ? `Akira place ${mine.place}` : 'Akira absent';
  const phrase = view.phrase ?? 'pas de phrase';
  return `${view.groupLabel || 'sans groupe'} · ${view.cards.length} cartes · ${place} · ${phrase}`;
}

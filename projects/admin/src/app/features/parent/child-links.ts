/** Liste fermée du lien entre deux enfants (SCRUM-158). */
export const CHILD_LINKS = [
  { code: 'AUCUN', label: 'Aucun' },
  { code: 'FRERE', label: 'Frère' },
  { code: 'SOEUR', label: 'Sœur' },
  { code: 'DEMI_FRERE', label: 'Demi-frère' },
  { code: 'DEMI_SOEUR', label: 'Demi-sœur' },
  { code: 'JUMEAU', label: 'Jumeau' },
  { code: 'JUMELLE', label: 'Jumelle' },
  { code: 'COUSIN', label: 'Cousin' },
  { code: 'COUSINE', label: 'Cousine' },
] as const;

export type ChildLinkCode = (typeof CHILD_LINKS)[number]['code'];

export interface ChildLinkChoice {
  code: Exclude<ChildLinkCode, 'AUCUN'>;
  label: string;
}

/**
 * Mots proposés pour l'enfant déjà inscrit, celui de « Lier avec » (SCRUM-168).
 * Un garçon n'est pas proposé comme sœur. Non genré garde un code par famille, avec le libellé neutre.
 */
export function linksForSex(sex: string | null | undefined): ChildLinkChoice[] {
  if (sex === 'FILLE') {
    return [
      { code: 'SOEUR', label: 'Sœur' },
      { code: 'DEMI_SOEUR', label: 'Demi-sœur' },
      { code: 'JUMELLE', label: 'Jumelle' },
      { code: 'COUSINE', label: 'Cousine' },
    ];
  }
  if (sex === 'GARCON') {
    return [
      { code: 'FRERE', label: 'Frère' },
      { code: 'DEMI_FRERE', label: 'Demi-frère' },
      { code: 'JUMEAU', label: 'Jumeau' },
      { code: 'COUSIN', label: 'Cousin' },
    ];
  }
  return [
    { code: 'FRERE', label: 'Frère/sœur' },
    { code: 'DEMI_FRERE', label: 'Demi-frère/sœur' },
    { code: 'JUMEAU', label: 'Jumeau/jumelle' },
    { code: 'COUSIN', label: 'Cousin/cousine' },
  ];
}

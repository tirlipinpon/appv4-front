/** Liste fermée du lien entre le nouvel enfant et l'enfant de départ (SCRUM-158). */
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

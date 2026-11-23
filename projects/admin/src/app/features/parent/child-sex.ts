/** Sexe d'un enfant. Le mot du lien (frère, sœur…) suit ce choix. */
export const CHILD_SEXES = [
  { code: 'FILLE', label: 'Fille' },
  { code: 'GARCON', label: 'Garçon' },
  { code: 'NON_GENRE', label: 'Non genré' },
] as const;

export function sexLabel(code: string | undefined): string {
  return CHILD_SEXES.find((item) => item.code === code)?.label ?? 'Non genré';
}

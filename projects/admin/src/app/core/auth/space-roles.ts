/**
 * Codes d'espace envoyés au back et lus dans le JWT.
 * Si le mot change, c'est le seul endroit à modifier côté admin.
 */
export const SpaceRoles = {
  parent: 'parent',
  teacher: 'teacher',
} as const;

export type SpaceRole = (typeof SpaceRoles)[keyof typeof SpaceRoles];

const SPACE_ROLE_VALUES: readonly SpaceRole[] = Object.values(SpaceRoles);

const SPACE_LABEL: Record<SpaceRole, string> = {
  [SpaceRoles.parent]: 'parent',
  [SpaceRoles.teacher]: 'professeur',
};

export function isSpaceRole(value: unknown): value is SpaceRole {
  return SPACE_ROLE_VALUES.some((role) => role === value);
}

/** Libellé d'écran. `null` retombe sur parent, comme l'en-tête quand aucun espace n'est choisi. */
export function spaceRoleLabel(role: SpaceRole | null): string {
  return role ? SPACE_LABEL[role] : SPACE_LABEL[SpaceRoles.parent];
}

/** L'autre espace, pour le bouton de changement. */
export function otherSpaceRole(role: SpaceRole): SpaceRole {
  return role === SpaceRoles.parent ? SpaceRoles.teacher : SpaceRoles.parent;
}

import { isSpaceRole, type SpaceRole } from './space-roles';

export type { SpaceRole } from './space-roles';

/** Lecture du jeton : source de l'espace affiché (SCRUM-125). */
export interface AdminTokenSession {
  activeRole: SpaceRole | null;
  roles: SpaceRole[];
  pendingTeacher: boolean;
  /** Modération des demandes professeur. Ce n'est pas un espace parent ou professeur. */
  admin: boolean;
}

const EMPTY_SESSION: AdminTokenSession = {
  activeRole: null,
  roles: [],
  pendingTeacher: false,
  admin: false,
};

/**
 * Lit les claims sans vérifier la signature. Le back reste la source au prochain appel.
 */
export function readAdminToken(token: string | null): AdminTokenSession {
  if (!token) {
    return EMPTY_SESSION;
  }
  const payload = token.split('.')[1];
  if (!payload) {
    return EMPTY_SESSION;
  }
  try {
    const json = JSON.parse(decodeBase64Url(payload)) as {
      activeRole?: unknown;
      roles?: unknown;
      pendingTeacher?: unknown;
    };
    const activeRole = isSpaceRole(json.activeRole) ? json.activeRole : null;
    const rawRoles = Array.isArray(json.roles) ? json.roles : [];
    const roles = rawRoles.filter(isSpaceRole);
    return {
      activeRole,
      roles,
      pendingTeacher: json.pendingTeacher === true,
      admin: rawRoles.includes('admin'),
    };
  } catch {
    return EMPTY_SESSION;
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

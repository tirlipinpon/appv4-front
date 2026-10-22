/** Espace parent ou professeur, tel que le back le met dans le JWT. */
export type SpaceRole = 'parent' | 'teacher';

/** Lecture du jeton : source de l'espace affiché (SCRUM-125). */
export interface AdminTokenSession {
  activeRole: SpaceRole | null;
  roles: SpaceRole[];
}

const EMPTY_SESSION: AdminTokenSession = { activeRole: null, roles: [] };

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
    };
    const activeRole = isSpaceRole(json.activeRole) ? json.activeRole : null;
    const roles = Array.isArray(json.roles) ? json.roles.filter(isSpaceRole) : [];
    return { activeRole, roles };
  } catch {
    return EMPTY_SESSION;
  }
}

function isSpaceRole(value: unknown): value is SpaceRole {
  return value === 'parent' || value === 'teacher';
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

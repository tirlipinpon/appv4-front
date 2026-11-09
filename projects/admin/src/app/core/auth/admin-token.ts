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
 * Un jeton sans trois segments, sans JSON, ou déjà expiré ne donne pas de session.
 */
export function readAdminToken(token: string | null, nowMs = Date.now()): AdminTokenSession {
  const json = readJwtPayload(token);
  if (!json || !hasFutureExpiry(json, nowMs)) {
    return EMPTY_SESSION;
  }
  const activeRole = isSpaceRole(json['activeRole']) ? json['activeRole'] : null;
  const rawRoles = Array.isArray(json['roles']) ? json['roles'] : [];
  const roles = rawRoles.filter(isSpaceRole);
  return {
    activeRole,
    roles,
    pendingTeacher: json['pendingTeacher'] === true,
    admin: rawRoles.includes('admin'),
  };
}

/** Structure JWT lisible et `exp` encore dans le futur. Pas de contrôle de signature. */
export function isUsableAdminToken(token: string | null, nowMs = Date.now()): boolean {
  const json = readJwtPayload(token);
  return json !== null && hasFutureExpiry(json, nowMs);
}

function readJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return null;
  }
  try {
    const json = JSON.parse(decodeBase64Url(parts[1])) as unknown;
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return null;
    }
    return json as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasFutureExpiry(json: Record<string, unknown>, nowMs: number): boolean {
  const exp = json['exp'];
  return typeof exp === 'number' && Number.isFinite(exp) && exp * 1000 > nowMs;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

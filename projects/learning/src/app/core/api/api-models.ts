/**
 * Alias sur le contrat OpenAPI de l'app enfant (LEARN-26).
 * Ne pas redécrire ces formes à la main dans les services.
 */
import type { components } from './schema';

export type ChildLoginRequest = components['schemas']['ChildLoginRequest'];
export type ChildLoginResponse = Required<components['schemas']['ChildLoginResponse']>;
export type ChildSessionResponse = Required<components['schemas']['ChildSessionResponse']>;

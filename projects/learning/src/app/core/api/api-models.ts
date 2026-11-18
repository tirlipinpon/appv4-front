/**
 * Alias sur le contrat OpenAPI de l'app enfant.
 * Ne pas redécrire ces formes à la main dans les services.
 */
import type { components } from './schema';

export type ChildLoginRequest = components['schemas']['ChildLoginRequest'];
export type ChildLoginResponse = Required<components['schemas']['ChildLoginResponse']>;
export type ChildSessionResponse = Required<components['schemas']['ChildSessionResponse']>;
export type ChildProfileResponse = Required<
  Pick<components['schemas']['ChildProfileResponse'], 'childId' | 'firstName' | 'hasPhoto'>
> & {
  avatarCode?: string | null;
};

export type ChildLearningSubjectItem = components['schemas']['ChildLearningSubjectItem'];
export type ChildLearningSubjectsResponse = components['schemas']['ChildLearningSubjectsResponse'];

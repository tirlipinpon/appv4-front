/**
 * Alias pratiques sur les schémas OpenAPI (SCRUM-148).
 * Ne pas dupliquer ces formes à la main dans les data-access.
 *
 * <p>Les réponses SpringDoc sortent souvent sans {@code required} → champs optionnels.
 * On force {@code Required<>} pour les DTO qu'on sait toujours peuplés côté back.
 */
import type { components } from './schema';

export type JwtTokenResponse = Required<components['schemas']['JwtTokenResponse']>;
export type AuthorizeUrlResponse = Required<components['schemas']['AuthorizeUrlResponse']>;
export type AuthMessageResponse = Required<components['schemas']['AuthMessageResponse']>;
export type AuthErrorBody = Required<components['schemas']['AuthErrorBody']>;
export type HelloMessageResponse = Required<components['schemas']['HelloMessageResponse']>;
export type LoginRequest = components['schemas']['LoginRequest'];
export type SignupRequest = components['schemas']['SignupRequest'];
export type SwitchRoleRequest = components['schemas']['SwitchRoleRequest'];
export type CompleteRolesRequest = components['schemas']['CompleteRolesRequest'];
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest'];
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest'];
export type GoogleLoginRequest = components['schemas']['GoogleLoginRequest'];
export type FacebookLoginRequest = components['schemas']['FacebookLoginRequest'];
export type AppleLoginRequest = components['schemas']['AppleLoginRequest'];

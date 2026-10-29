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
export type SpaceAccessResponse = Required<components['schemas']['SpaceAccessResponse']>;
export type ConnectedAccountResponse = Required<components['schemas']['ConnectedAccountResponse']>;
export type CompleteRolesRequest = components['schemas']['CompleteRolesRequest'];
export type TeacherRequestItem = components['schemas']['TeacherRequestItem'];
export type TeacherProfileResponse = components['schemas']['TeacherProfileResponse'];
export type UpdateTeacherProfileRequest = components['schemas']['UpdateTeacherProfileRequest'];
export type TeacherAssignedSchool = components['schemas']['TeacherAssignedSchool'];
export type TeacherAvailableSchool = components['schemas']['TeacherAvailableSchool'];
export type TeacherCurriculumOption = components['schemas']['TeacherCurriculumOption'];
export type TeacherSchoolInput = components['schemas']['TeacherSchoolInput'];
export type TeacherRemovalPreviewResponse = components['schemas']['TeacherRemovalPreviewResponse'];
export type TeacherRemovalStudent = components['schemas']['TeacherRemovalStudent'];
export type TeacherRemovalSubject = components['schemas']['TeacherRemovalSubject'];
export type ParentProfileResponse = components['schemas']['ParentProfileResponse'];
export type UpdateParentProfileRequest = components['schemas']['UpdateParentProfileRequest'];
export type AvatarChoice = components['schemas']['AvatarChoice'];
export type ParentChildrenResponse = components['schemas']['ParentChildrenResponse'];
export type ParentChildResponse = components['schemas']['ParentChildResponse'];
export type ParentChildLink = components['schemas']['ParentChildLink'];
export type ParentSchoolOption = components['schemas']['ParentSchoolOption'];
export type ParentGradeList = components['schemas']['ParentGradeList'];
export type CreateParentChildRequest = components['schemas']['CreateParentChildRequest'];
export type TeacherRequestListResponse = components['schemas']['TeacherRequestListResponse'];
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest'];
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest'];
export type GoogleLoginRequest = components['schemas']['GoogleLoginRequest'];
export type FacebookLoginRequest = components['schemas']['FacebookLoginRequest'];
export type AppleLoginRequest = components['schemas']['AppleLoginRequest'];
export type TeacherStudentsResponse = components['schemas']['TeacherStudentsResponse'];
export type TeacherStudentSchool = components['schemas']['TeacherStudentSchool'];
export type TeacherStudentGrade = components['schemas']['TeacherStudentGrade'];
export type TeacherStudentLine = components['schemas']['TeacherStudentLine'];
export type TeacherSubjectsResponse = components['schemas']['TeacherSubjectsResponse'];
export type TeacherSubjectSchool = components['schemas']['TeacherSubjectSchool'];
export type TeacherSubjectGrade = components['schemas']['TeacherSubjectGrade'];
export type TeacherSubjectItem = components['schemas']['TeacherSubjectItem'];
export type TeacherSubjectSharedHolder = components['schemas']['TeacherSubjectSharedHolder'];
export type CreateTeacherSubjectRequest = components['schemas']['CreateTeacherSubjectRequest'];
export type RenameTeacherSubjectRequest = components['schemas']['RenameTeacherSubjectRequest'];
export type DeactivateTeacherSubjectRequest = components['schemas']['DeactivateTeacherSubjectRequest'];
export type TransferTeacherSubjectRequest = components['schemas']['TransferTeacherSubjectRequest'];
export type TeacherSubjectColleaguesResponse = components['schemas']['TeacherSubjectColleaguesResponse'];
export type TeacherSubjectColleagueItem = components['schemas']['TeacherSubjectColleagueItem'];
export type TeacherQuestionFormsResponse = Required<components['schemas']['TeacherQuestionFormsResponse']>;
export type TeacherQuestionFormItem = Required<components['schemas']['TeacherQuestionFormItem']>;
export type TeacherSubjectQuestionsResponse = Required<
  components['schemas']['TeacherSubjectQuestionsResponse']
>;
export type TeacherSubjectQuestionItem = Required<components['schemas']['TeacherSubjectQuestionItem']>;
export type TeacherQuestionChoiceItem = Required<components['schemas']['TeacherQuestionChoiceItem']>;
export type CreateTeacherSubjectQuestionRequest =
  components['schemas']['CreateTeacherSubjectQuestionRequest'];
export type CloneTeacherSubjectQuestionsRequest =
  components['schemas']['CloneTeacherSubjectQuestionsRequest'];
export type TeacherSubjectFollowersResponse = Required<
  components['schemas']['TeacherSubjectFollowersResponse']
>;
export type DeleteTeacherSubjectQuestionsRequest =
  components['schemas']['DeleteTeacherSubjectQuestionsRequest'];
export type DeleteTeacherSubjectQuestionsResponse = Required<
  components['schemas']['DeleteTeacherSubjectQuestionsResponse']
>;
export type TeacherQuestionChoiceInput = components['schemas']['TeacherQuestionChoiceInput'];
export type TeacherTransferInvitesResponse = components['schemas']['TeacherTransferInvitesResponse'];
export type TeacherTransferInviteItem = components['schemas']['TeacherTransferInviteItem'];
export type TeacherDeactivateNoticesResponse = components['schemas']['TeacherDeactivateNoticesResponse'];
export type TeacherDeactivateNoticeItem = components['schemas']['TeacherDeactivateNoticeItem'];
export type ChildSubjectsResponse = components['schemas']['ChildSubjectsResponse'];
export type ChildSubjectOffer = components['schemas']['ChildSubjectOffer'];
export type ParentSubjectsResponse = components['schemas']['ParentSubjectsResponse'];
export type AddChildSubjectRequest = components['schemas']['AddChildSubjectRequest'];

/**
 * Alias pratiques sur les schémas OpenAPI (SCRUM-148).
 * Ne pas dupliquer ces formes à la main dans les data-access.
 *
 * <p>Les réponses SpringDoc sortent souvent sans {@code required} → champs optionnels.
 * On force {@code Required<>} pour les DTO qu'on sait toujours peuplés côté back.
 */
import type { components } from '@appv4/api';

export type JwtTokenResponse = Required<components['schemas']['JwtTokenResponse']>;
export type AuthorizeUrlResponse = Required<components['schemas']['AuthorizeUrlResponse']>;
export type AuthMessageResponse = Required<components['schemas']['AuthMessageResponse']>;
export type RecoverIdentifierRequest = components['schemas']['RecoverIdentifierRequest'];
export type RecoveryPromptRequest = components['schemas']['RecoveryPromptRequest'];
export type RecoverIdentifierResponse = components['schemas']['RecoverIdentifierResponse'];
export type AuthErrorBody = Required<components['schemas']['AuthErrorBody']>;
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
export type ParentRankingCase = components['schemas']['ParentRankingCase'];
export type SaveParentRankingRequest = components['schemas']['SaveParentRankingRequest'];
export type InviteParentRequest = components['schemas']['InviteParentRequest'];
export type InvitationReceiptResponse = components['schemas']['InvitationReceiptResponse'];
export type PendingInvitationResponse = components['schemas']['PendingInvitationResponse'];
export type ShareRequestResponse = components['schemas']['ShareRequestResponse'];
export type ShareRequestChildResponse = components['schemas']['ShareRequestChildResponse'];
export type FicheHolderResponse = components['schemas']['FicheHolderResponse'];
export type TransferResponse = components['schemas']['TransferResponse'];
export type ParentChildLink = components['schemas']['ParentChildLink'];
export type ParentSchoolOption = components['schemas']['ParentSchoolOption'];
export type ParentGradeList = components['schemas']['ParentGradeList'];
export type CreateParentChildRequest = components['schemas']['CreateParentChildRequest'];
export type TeacherRequestListResponse = components['schemas']['TeacherRequestListResponse'];
export type HumeurChoiceItem = components['schemas']['HumeurChoiceItem'];
export type HumeurChoiceListResponse = components['schemas']['HumeurChoiceListResponse'];
export type HumeurChoiceRequest = components['schemas']['HumeurChoiceRequest'];
export type AppHoursResponse = Required<components['schemas']['AppHoursResponse']>;
export type AppHoursRequest = components['schemas']['AppHoursRequest'];
export type ParentHumeurListResponse = components['schemas']['ParentHumeurListResponse'];
export type ParentHumeurChildItem = components['schemas']['ParentHumeurChildItem'];
export type ParentHumeurItem = components['schemas']['ParentHumeurItem'];
export type JourneeMonthResponse = components['schemas']['JourneeMonthResponse'];
export type ParentJourneeMonthResponse = components['schemas']['ParentJourneeMonthResponse'];
export type PlafondResponse = components['schemas']['PlafondResponse'];
export type PlafondRequest = components['schemas']['PlafondRequest'];
export type JourneeItem = components['schemas']['JourneeItem'];
export type JourneeLineItem = components['schemas']['JourneeLineItem'];
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
export type TeacherSubjectAddableCourse = components['schemas']['TeacherSubjectAddableCourse'];
export type TeacherSubjectItem = components['schemas']['TeacherSubjectItem'];
export type TeacherSubjectSharedHolder = components['schemas']['TeacherSubjectSharedHolder'];
export type CreateTeacherSubjectRequest = components['schemas']['CreateTeacherSubjectRequest'];
export type SetTeacherSubjectIconRequest = components['schemas']['SetTeacherSubjectIconRequest'];
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
export type TeacherQuestionGamificationCatalog = components['schemas']['TeacherQuestionGamificationCatalog'];
export type TeacherQuestionGamificationItem = components['schemas']['TeacherQuestionGamificationItem'];
export type TeacherQuestionDifficultyItem = components['schemas']['TeacherQuestionDifficultyItem'];
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
export type LetterAttemptRequest = components['schemas']['LetterAttemptRequest'];
export type LetterAttemptResponse = components['schemas']['LetterAttemptResponse'];
export type TeacherQuestionChoiceInput = components['schemas']['TeacherQuestionChoiceInput'];
export type TeacherTransferInvitesResponse = components['schemas']['TeacherTransferInvitesResponse'];
export type TeacherTransferInviteItem = components['schemas']['TeacherTransferInviteItem'];
export type TeacherDeactivateNoticesResponse = components['schemas']['TeacherDeactivateNoticesResponse'];
export type TeacherDeactivateNoticeItem = components['schemas']['TeacherDeactivateNoticeItem'];
export type ChildSubjectsResponse = components['schemas']['ChildSubjectsResponse'];
export type ChildSubjectOffer = components['schemas']['ChildSubjectOffer'];
export type ParentSubjectsResponse = components['schemas']['ParentSubjectsResponse'];
export type AddChildSubjectRequest = components['schemas']['AddChildSubjectRequest'];
export type CreateConnexionRequest = components['schemas']['CreateConnexionRequest'];
export type ConnexionResponse = components['schemas']['ConnexionResponse'];
export type ConnexionListResponse = components['schemas']['ConnexionListResponse'];
export type EssaiResponse = components['schemas']['EssaiResponse'];
export type CatalogueResponse = components['schemas']['CatalogueResponse'];
export type LectureResponse = components['schemas']['LectureResponse'];
export type FournisseurResponse = components['schemas']['FournisseurResponse'];
export type ModeleResponse = components['schemas']['ModeleResponse'];
export type RoutesResponse = components['schemas']['RoutesResponse'];
export type RouteResponse = components['schemas']['RouteResponse'];
export type CreateRouteRequest = components['schemas']['CreateRouteRequest'];
export type UsageResponse = components['schemas']['UsageResponse'];
export type UsageLineResponse = components['schemas']['UsageLineResponse'];
export type ChangesResponse = components['schemas']['ChangesResponse'];
export type ChangeResponse = components['schemas']['ChangeResponse'];
export type ParentProgressResponse = components['schemas']['ParentProgressResponse'];
export type ProgressDayResponse = components['schemas']['ProgressDayResponse'];

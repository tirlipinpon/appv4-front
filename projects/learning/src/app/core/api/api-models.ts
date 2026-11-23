/**
 * Alias sur le contrat OpenAPI de l'app enfant.
 * Ne pas redécrire ces formes à la main dans les services.
 */
import type { components, operations } from '@appv4/api';

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
export type ChildLearningQuestionsResponse = components['schemas']['ChildLearningQuestionsResponse'];
export type ChildLearningQuestionItem = components['schemas']['ChildLearningQuestionItem'];
export type ChildPlayQuestionResponse = components['schemas']['ChildPlayQuestionResponse'];
export type SubmitChildAttemptRequest = components['schemas']['SubmitChildAttemptRequest'];
export type ChildAttemptResultResponse = components['schemas']['ChildAttemptResultResponse'];
export type ChildLetterLocksResponse = components['schemas']['ChildLetterLocksResponse'];
export type ChildProgressResponse = Required<
  Pick<
    components['schemas']['ChildProgressResponse'],
    'xpTotal' | 'currentStreak' | 'leagueLabel' | 'weekDays'
  >
>;
export type ChildTodayTask = components['schemas']['ChildTodayTask'];
export type ChildTodayMission = components['schemas']['ChildTodayMission'];
export type ChildTodayResponse = components['schemas']['ChildTodayResponse'];
export type ChildBadgesResponse = components['schemas']['ChildBadgesResponse'];
export type ChildFeaturedQuestionsResponse =
  operations['readChildFeaturedQuestions']['responses'][200]['content']['*/*'];
export type ChildHumeurPromptResponse = components['schemas']['ChildHumeurPromptResponse'];
export type ChildHumeurChoiceItem = components['schemas']['ChildHumeurChoiceItem'];
export type ChildHumeurAnswerRequest = components['schemas']['ChildHumeurAnswerRequest'];
export type ChildSejourSignalRequest = components['schemas']['ChildSejourSignalRequest'];
export type ChildSejourResponse = components['schemas']['ChildSejourResponse'];
export type ChildBadge = components['schemas']['ChildBadgeResponse'];
export type ChildBadgeGained = components['schemas']['ChildBadgeGainedResponse'];
export type ChildBadgeNotice = components['schemas']['ChildBadgeNoticeResponse'];
export type SaveChildAvatarStyleRequest = components['schemas']['SaveChildAvatarStyleRequest'];
export type ChildAvatarResponse = components['schemas']['ChildAvatarResponse'];
export type ChildAvatarZoneCard = components['schemas']['ChildAvatarZoneCard'];
export type ChildAvatarVariantCard = components['schemas']['ChildAvatarVariantCard'];
export type ChildSubjectBoardResponse = components['schemas']['ChildSubjectBoardResponse'];
export type ChildSubjectContinueLesson = components['schemas']['ChildSubjectContinueLesson'];
export type ChildSubjectTopicCard = components['schemas']['ChildSubjectTopicCard'];

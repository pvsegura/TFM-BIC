export { createLanguageId, isValidLanguageId, type LanguageId } from "./language/language-id.js";
export { InvalidLanguageIdError } from "./language/invalid-language-id.error.js";

// Languages & Content (M5) — see docs/architecture/content-architecture.md.
export {
  isValidLocaleForLanguage,
  isValidTextDirection,
  TEXT_DIRECTIONS,
  type Language,
  type TextDirection,
} from "./language/language.js";
export {
  CEFR_LEVELS,
  createLevelId,
  getLevel,
  isValidLevelId,
  LEVEL_IDS,
  type Level,
  type LevelId,
} from "./language/level-id.js";
export {
  isLevelSelectable,
  isValidLevelStatus,
  LEVEL_STATUSES,
  type LanguageLevel,
  type LevelStatus,
} from "./language/language-level.js";
export { InvalidLevelIdError } from "./language/errors/invalid-level-id.error.js";
export { LanguageNotFoundError } from "./language/errors/language-not-found.error.js";
export { LevelNotAvailableError } from "./language/errors/level-not-available.error.js";
export { CONTENT_TYPES, isValidContentType, type ContentType } from "./content/content-type.js";
export {
  CONTENT_STATUSES,
  isPublished,
  isValidContentStatus,
  type ContentStatus,
} from "./content/content-status.js";
export {
  contentIdBelongsToLanguage,
  createContentId,
  isValidContentId,
  type ContentId,
} from "./content/content-id.js";
export { compareContentItems, sortContentItems } from "./content/content-ordering.js";
export type {
  ContentBlock,
  ContentBlockType,
  ContentItem,
  DialogueBlock,
  DialogueLine,
  ExampleBlock,
  ExplanationBlock,
} from "./content/content-item.js";
export {
  validateContentCatalog,
  type CatalogIssue,
  type ContentCatalog,
} from "./content/content-catalog.js";
export { InvalidContentIdError } from "./content/errors/invalid-content-id.error.js";
export { ContentNotFoundError } from "./content/errors/content-not-found.error.js";

// Lessons (M6) — a lesson is a content item of type `lesson`; progress is per student.
export { isLesson, type LessonId } from "./lesson/lesson.js";
export {
  completeLesson,
  LESSON_PROGRESS_STATUSES,
  LESSON_PROGRESS_VIEW_STATUSES,
  progressStatusOf,
  startLesson,
  type LessonProgress,
  type LessonProgressStatus,
  type StoredLessonProgressStatus,
} from "./lesson/lesson-progress.js";
export { LessonNotFoundError } from "./lesson/errors/lesson-not-found.error.js";

// Identity & Authentication (M3) — see docs/architecture/domain-model.md.
export { createEmail, isValidEmail, normalizeEmail } from "./identity/email.js";
export {
  createPassword,
  isValidPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "./identity/password.js";
export { isValidRole, ROLES, type Role } from "./identity/role.js";
export { requireRole } from "./identity/authorization.js";
export { toSafeUser, type SafeUser, type User } from "./identity/user.js";
export { isSessionExpired, type Session } from "./identity/session.js";
export { isTokenUsable, type SecurityToken } from "./identity/security-token.js";
export type { EmailVerificationToken } from "./identity/email-verification-token.js";
export type { PasswordResetToken } from "./identity/password-reset-token.js";
export { InvalidEmailError } from "./identity/errors/invalid-email.error.js";
export { WeakPasswordError } from "./identity/errors/weak-password.error.js";
export { ForbiddenError } from "./identity/errors/forbidden.error.js";
export { InvalidCredentialsError } from "./identity/errors/invalid-credentials.error.js";
export { DuplicateEmailError } from "./identity/errors/duplicate-email.error.js";
export { InvalidTokenError } from "./identity/errors/invalid-token.error.js";
export { TokenExpiredError } from "./identity/errors/token-expired.error.js";
export { TokenAlreadyUsedError } from "./identity/errors/token-already-used.error.js";

// Media (M4) — the static avatar catalog.
export {
  AVATAR_CATALOG,
  AVATAR_IDS,
  isValidAvatarId,
  type AvatarDefinition,
  type AvatarId,
} from "./media/avatar-catalog.js";

// Student Profile (M4) — see docs/architecture/domain-model.md.
export type { StudentProfile } from "./profile/student-profile.js";
export {
  createProfileName,
  isValidProfileName,
  MAX_PROFILE_NAME_LENGTH,
  normalizeProfileName,
} from "./profile/profile-name.js";
export {
  createNickname,
  isValidNickname,
  MAX_NICKNAME_LENGTH,
  MIN_NICKNAME_LENGTH,
  normalizeNickname,
} from "./profile/nickname.js";
export { createAvatarId } from "./profile/avatar-selection.js";
export { InvalidProfileNameError } from "./profile/errors/invalid-profile-name.error.js";
export { InvalidNicknameError } from "./profile/errors/invalid-nickname.error.js";
export { InvalidAvatarIdError } from "./profile/errors/invalid-avatar-id.error.js";

// Exercises (M7) — an exercise is content tied to a lesson; evaluation is a per-type strategy;
// attempts are per-student history. See docs/adr/adr-020-exercises.md.
export {
  EXERCISE_TYPES,
  isValidExerciseType,
  type ExerciseType,
} from "./exercise/exercise-type.js";
export {
  createExerciseId,
  exerciseIdBelongsToLanguage,
  isValidExerciseId,
  type ExerciseId,
} from "./exercise/exercise-id.js";
export type { ExerciseAnswerValue } from "./exercise/exercise-answer.js";
export type { EvaluationResult } from "./exercise/evaluation-result.js";
export type {
  ExerciseBase,
  ExerciseOfType,
  PresentedExerciseBase,
} from "./exercise/exercise-base.js";
export type { Exercise, PresentedExercise } from "./exercise/exercise.js";
export type { ExerciseEvaluator, ExercisePresenter } from "./exercise/exercise-evaluator.js";
export {
  createDefaultExerciseTypeRegistry,
  ExerciseTypeRegistry,
  registerExerciseType,
  type EvaluatedAnswer,
  type RegisteredExerciseType,
} from "./exercise/exercise-registry.js";
export {
  isValidOptionId,
  MAX_OPTION_ID_LENGTH,
  MAX_OPTIONS,
  MIN_OPTIONS,
  multipleChoiceEvaluator,
  multipleChoicePresenter,
  type MultipleChoiceAnswer,
  type MultipleChoiceConfiguration,
  type MultipleChoiceExercise,
  type MultipleChoiceOption,
  type PresentedMultipleChoice,
} from "./exercise/types/multiple-choice.js";
export {
  MAX_TEXT_ANSWER_LENGTH,
  normalizeTextAnswer,
  textAnswerEvaluator,
  textAnswerPresenter,
  type PresentedTextAnswer,
  type TextAnswer,
  type TextAnswerConfiguration,
  type TextAnswerExercise,
  type TextNormalization,
} from "./exercise/types/text-answer.js";
export {
  trueFalseEvaluator,
  trueFalsePresenter,
  type PresentedTrueFalse,
  type TrueFalseAnswer,
  type TrueFalseConfiguration,
  type TrueFalseExercise,
} from "./exercise/types/true-false.js";
export {
  EXERCISE_RESULT_STATUSES,
  resultStatusOf,
  summarizeAttempts,
  type ExerciseAttempt,
  type ExerciseAttemptSummary,
  type ExerciseResultStatus,
  type NewExerciseAttempt,
} from "./exercise/exercise-attempt.js";
export { InvalidExerciseIdError } from "./exercise/errors/invalid-exercise-id.error.js";
export { ExerciseNotFoundError } from "./exercise/errors/exercise-not-found.error.js";
export { InvalidExerciseAnswerError } from "./exercise/errors/invalid-exercise-answer.error.js";
export { InvalidExerciseConfigurationError } from "./exercise/errors/invalid-exercise-configuration.error.js";
export { UnsupportedExerciseTypeError } from "./exercise/errors/unsupported-exercise-type.error.js";

// Gamification (M8) — points are a domain concept: an append-only ledger of rewards, each with a
// stable identity. See docs/adr/adr-021-gamification.md.
export {
  ACHIEVEMENT_UNLOCK_POINTS,
  createPointAmount,
  EXERCISE_COMPLETION_POINTS,
  isValidPointAmount,
  LESSON_COMPLETION_POINTS,
  MAX_POINT_AMOUNT,
} from "./gamification/point-amount.js";
export {
  isValidRewardReason,
  pointsFor,
  REWARD_REASONS,
  type RewardReason,
} from "./gamification/reward-reason.js";
export { assertRewardSourceId, isValidRewardSourceId } from "./gamification/reward-source.js";
export {
  createPointTransaction,
  type NewPointTransaction,
  type PointTransaction,
  type PointTransactionInput,
} from "./gamification/point-transaction.js";
export { InvalidPointAmountError } from "./gamification/errors/invalid-point-amount.error.js";
export { InvalidPointTransactionError } from "./gamification/errors/invalid-point-transaction.error.js";
export { InvalidRewardSourceError } from "./gamification/errors/invalid-reward-source.error.js";
export {
  createAchievementKey,
  isValidAchievementKey,
  type AchievementKey,
} from "./gamification/achievement-key.js";
export {
  ACHIEVEMENT_ICON_IDS,
  isAchieved,
  progressToward,
  type AchievementDefinition,
  type AchievementIconId,
  type AchievementProgress,
  type AchievementRule,
} from "./gamification/achievement.js";
export { completionCountRule, totalPointsRule } from "./gamification/achievement-rules.js";
export {
  AchievementRegistry,
  createDefaultAchievementRegistry,
} from "./gamification/achievement-registry.js";
export {
  GAMIFICATION_EVENT_TYPES,
  type GamificationEvent,
  type GamificationEventType,
} from "./gamification/gamification-event.js";
export {
  factsFromTotals,
  type GamificationFacts,
  type RewardTotal,
} from "./gamification/gamification-facts.js";
export { findAchieved } from "./gamification/evaluate-achievements.js";
export { InvalidAchievementError } from "./gamification/errors/invalid-achievement.error.js";

// Vocabulary (M9) — an entry is content (a validated file, grouped in a category of its language);
// what a student does with it is per-student state. See docs/adr/adr-022-vocabulary.md.
export {
  createVocabularyItemId,
  isValidVocabularyItemId,
  vocabularyItemIdBelongsToLanguage,
  type VocabularyItemId,
} from "./vocabulary/vocabulary-item-id.js";
export {
  createVocabularyCategoryId,
  isValidVocabularyCategoryId,
  type VocabularyCategoryId,
} from "./vocabulary/vocabulary-category-id.js";
export {
  isValidPartOfSpeech,
  PARTS_OF_SPEECH,
  type PartOfSpeech,
} from "./vocabulary/part-of-speech.js";
export {
  GRAMMATICAL_GENDERS,
  isValidGrammaticalGender,
  type GrammaticalGender,
} from "./vocabulary/grammatical-gender.js";
export type { VocabularyCategory } from "./vocabulary/vocabulary-category.js";
export type { VocabularyExample, VocabularyItem } from "./vocabulary/vocabulary-item.js";
export { foldForSearch, matchesVocabularySearch } from "./vocabulary/vocabulary-search.js";
export {
  ALLOWED_STATUS_CHANGES,
  changeVocabularyStatus,
  evaluateStatusChange,
  saveVocabularyItem,
  statusOf,
  STORED_VOCABULARY_STATUSES,
  VOCABULARY_VIEW_STATUSES,
  type StatusChange,
  type StatusChangeResult,
  type StoredVocabularyStatus,
  type UserVocabularyEntry,
  type VocabularyStatus,
} from "./vocabulary/user-vocabulary.js";
export {
  VOCABULARY_EVENT_TYPES,
  type VocabularyEvent,
  type VocabularyEventType,
  type VocabularyItemLearnedEvent,
} from "./vocabulary/vocabulary-event.js";
export { InvalidVocabularyItemIdError } from "./vocabulary/errors/invalid-vocabulary-item-id.error.js";
export { InvalidVocabularyCategoryIdError } from "./vocabulary/errors/invalid-vocabulary-category-id.error.js";
export { InvalidVocabularyTransitionError } from "./vocabulary/errors/invalid-vocabulary-transition.error.js";
export { VocabularyItemNotFoundError } from "./vocabulary/errors/vocabulary-item-not-found.error.js";
export { VocabularyCategoryNotFoundError } from "./vocabulary/errors/vocabulary-category-not-found.error.js";

// Phonetics (M10) — a representation is content (a validated file, grouped in a topic of its
// language); a student's progress on it is per-student state. Independent of Vocabulary: an
// example word is free text, never a VocabularyItemId reference.
export {
  createPhoneticRepresentationId,
  isValidPhoneticRepresentationId,
  phoneticRepresentationIdBelongsToLanguage,
  type PhoneticRepresentationId,
} from "./phonetics/phonetic-representation-id.js";
export {
  createPhoneticTopicId,
  isValidPhoneticTopicId,
  type PhoneticTopicId,
} from "./phonetics/phonetic-topic-id.js";
export type {
  PhoneticExampleWord,
  PhoneticRepresentation,
} from "./phonetics/phonetic-representation.js";
export type { PhoneticTopic } from "./phonetics/phonetic-topic.js";
export {
  completePhonetic,
  PHONETIC_PROGRESS_STATUSES,
  PHONETIC_PROGRESS_VIEW_STATUSES,
  phoneticProgressStatusOf,
  recordPhoneticPractice,
  recordPhoneticView,
  type PhoneticProgressStatus,
  type StoredPhoneticProgressStatus,
  type UserPhoneticProgress,
} from "./phonetics/user-phonetic-progress.js";
export { InvalidPhoneticRepresentationIdError } from "./phonetics/errors/invalid-phonetic-representation-id.error.js";
export { InvalidPhoneticTopicIdError } from "./phonetics/errors/invalid-phonetic-topic-id.error.js";
export { PhoneticRepresentationNotFoundError } from "./phonetics/errors/phonetic-representation-not-found.error.js";
export { PhoneticTopicNotFoundError } from "./phonetics/errors/phonetic-topic-not-found.error.js";
export { validatePhonetics, type PhoneticsCatalogContext } from "./phonetics/phonetics-catalog.js";

// Video (M11) — a definition is content (what should be generated, provider-independent); a
// generation job is the per-student request to render it, tracked through a small lifecycle
// (queued -> processing -> completed|failed). No provider (Hyperframes or otherwise) type ever
// appears here — see ADR-011/012 and the `hyperframes` skill.
export {
  createVideoDefinitionId,
  isValidVideoDefinitionId,
  videoDefinitionIdBelongsToLanguage,
  type VideoDefinitionId,
} from "./video/video-definition-id.js";
export type { VideoDefinition } from "./video/video-definition.js";
export {
  completeGeneration,
  failGeneration,
  requestVideoGeneration,
  startProcessing,
  VIDEO_GENERATION_STATUSES,
  type NewVideoGenerationJob,
  type VideoGenerationJob,
  type VideoGenerationStatus,
} from "./video/video-generation-job.js";
export { InvalidVideoDefinitionIdError } from "./video/errors/invalid-video-definition-id.error.js";
export { VideoDefinitionNotFoundError } from "./video/errors/video-definition-not-found.error.js";
export { VideoGenerationJobNotFoundError } from "./video/errors/video-generation-job-not-found.error.js";
export { InvalidVideoGenerationTransitionError } from "./video/errors/invalid-video-generation-transition.error.js";
export { validateVideoDefinitions, type VideoCatalogContext } from "./video/video-catalog.js";

// Audio (M12) — a request for speech in the platform's own terms: validated text, one of the
// platform's languages, and a provider-independent voice profile. No provider (Gemini or
// otherwise) type, model or voice name ever appears here — see ADR-013.
export {
  createSpeechRequest,
  createSpeechText,
  SPEECH_TEXT_MAX_LENGTH,
  speechRequestKey,
  type SpeechRequest,
  type SpeechText,
} from "./audio/speech-request.js";
export { isVoiceProfile, VOICE_PROFILES, type VoiceProfile } from "./audio/voice-profile.js";
export { AUDIO_FORMATS, type AudioFormat } from "./audio/audio-format.js";
export {
  InvalidSpeechTextError,
  type InvalidSpeechTextReason,
} from "./audio/errors/invalid-speech-text.error.js";

export type { Clock } from "./ports/clock.js";
export {
  GetHealthStatusUseCase,
  type GetHealthStatusInput,
  type GetHealthStatusResult,
} from "./health/get-health-status.use-case.js";

// Identity & Authentication (M3) ports — implemented in packages/data.
export type { CreateUserInput, UserRepository } from "./identity/ports/user-repository.js";
export type { CreateSessionInput, SessionRepository } from "./identity/ports/session-repository.js";
export type { PasswordHasher } from "./identity/ports/password-hasher.js";
export type { TokenGenerator } from "./identity/ports/token-generator.js";
export type {
  CreateEmailVerificationTokenInput,
  EmailVerificationTokenRepository,
} from "./identity/ports/email-verification-token-repository.js";
export type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRepository,
} from "./identity/ports/password-reset-token-repository.js";
export type { TokenConsumption } from "./identity/ports/token-consumption.js";
export type { EmailService } from "./identity/ports/email-service.js";

// Identity & Authentication (M3) use cases.
export {
  RegisterUserUseCase,
  type RegisterUserInput,
  type RegisterUserResult,
} from "./identity/use-cases/register-user.use-case.js";
export {
  LoginUseCase,
  type LoginInput,
  type LoginResult,
} from "./identity/use-cases/login.use-case.js";
export { LogoutUseCase, type LogoutInput } from "./identity/use-cases/logout.use-case.js";
export {
  ResolveSessionUseCase,
  type ResolveSessionInput,
} from "./identity/use-cases/resolve-session.use-case.js";
export {
  VerifyEmailUseCase,
  type VerifyEmailInput,
} from "./identity/use-cases/verify-email.use-case.js";
export {
  ResendVerificationUseCase,
  type ResendVerificationInput,
  type ResendVerificationResult,
} from "./identity/use-cases/resend-verification.use-case.js";
export {
  RequestPasswordResetUseCase,
  type RequestPasswordResetInput,
  type RequestPasswordResetResult,
} from "./identity/use-cases/request-password-reset.use-case.js";
export {
  ConfirmPasswordResetUseCase,
  type ConfirmPasswordResetInput,
} from "./identity/use-cases/confirm-password-reset.use-case.js";

// Languages & Content (M5) port — implemented in packages/data — and use cases.
export type { ContentRepository } from "./content/ports/content-repository.js";
export { ListLanguagesUseCase } from "./content/use-cases/list-languages.use-case.js";
export {
  ListLanguageLevelsUseCase,
  type LanguageLevelView,
  type ListLanguageLevelsInput,
  type ListLanguageLevelsResult,
} from "./content/use-cases/list-language-levels.use-case.js";
export {
  ListContentUseCase,
  type ContentSummary,
  type ListContentInput,
} from "./content/use-cases/list-content.use-case.js";
export {
  GetContentUseCase,
  type GetContentInput,
} from "./content/use-cases/get-content.use-case.js";

// Lessons (M6) port — implemented in packages/data — and use cases. Lesson content comes
// from the content port above; only the student's progress has its own port.
export type { LessonProgressRepository } from "./lesson/ports/lesson-progress-repository.js";
export { toProgressView, type LessonProgressView } from "./lesson/progress-view.js";
export {
  ListLessonsUseCase,
  type LessonSummary,
  type ListLessonsInput,
} from "./lesson/use-cases/list-lessons.use-case.js";
export {
  GetLessonUseCase,
  type GetLessonInput,
  type LessonDetail,
} from "./lesson/use-cases/get-lesson.use-case.js";
export {
  StartLessonUseCase,
  type StartLessonInput,
} from "./lesson/use-cases/start-lesson.use-case.js";
export {
  CompleteLessonUseCase,
  type CompleteLessonInput,
} from "./lesson/use-cases/complete-lesson.use-case.js";

// Student Profile (M4) port — implemented in packages/data.
export type { ProfilePatch, ProfileRepository } from "./profile/ports/profile-repository.js";

// Student Profile (M4) use cases.
export {
  GetCurrentStudentProfileUseCase,
  type GetCurrentStudentProfileInput,
} from "./profile/use-cases/get-current-student-profile.use-case.js";
export {
  UpdateCurrentStudentProfileUseCase,
  type UpdateCurrentStudentProfileInput,
} from "./profile/use-cases/update-current-student-profile.use-case.js";

// Exercises (M7) ports — implemented in packages/data — and use cases. Exercises are content (like
// lessons); only the student's attempts have persistence of their own.
export type { ExerciseRepository } from "./exercise/ports/exercise-repository.js";
export type { ExerciseAttemptRepository } from "./exercise/ports/exercise-attempt-repository.js";
export { toResultView, type ExerciseResultView } from "./exercise/result-view.js";
export { findVisibleExercise } from "./exercise/find-visible-exercise.js";
export {
  ListLessonExercisesUseCase,
  type ExerciseSummary,
  type LessonExercises,
  type ListLessonExercisesInput,
} from "./exercise/use-cases/list-lesson-exercises.use-case.js";
export {
  GetExerciseUseCase,
  type ExerciseDetail,
  type GetExerciseInput,
} from "./exercise/use-cases/get-exercise.use-case.js";
export {
  SubmitExerciseAnswerUseCase,
  type SubmitExerciseAnswerInput,
  type SubmitExerciseAnswerResult,
} from "./exercise/use-cases/submit-exercise-answer.use-case.js";

// Gamification (M8) port — implemented in packages/data — and use cases. Points live in an
// append-only ledger; achievements are domain rules; rewards are granted only by these use cases.
export type {
  GamificationRepository,
  GamificationStore,
  NewUserAchievement,
  PointHistoryRequest,
  PointTransactionPage,
  UserAchievement,
} from "./gamification/ports/gamification-repository.js";
export {
  AchievementTexts,
  DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
  DEFAULT_INTERFACE_LOCALE,
  type AchievementText,
  type AchievementTextCatalog,
} from "./gamification/achievement-texts.js";
export { RewardAwardError } from "./gamification/reward-award.error.js";
export {
  NO_REWARDS_VIEW,
  toRewardsView,
  type AchievementView,
  type PointTransactionView,
  type RewardsView,
  type UnlockedAchievementView,
} from "./gamification/views.js";
export {
  AwardRewardsUseCase,
  NO_REWARD,
  type AwardRewardsInput,
  type RewardOutcome,
  type RewardTrigger,
} from "./gamification/use-cases/award-rewards.use-case.js";
export {
  GetGamificationSummaryUseCase,
  type GamificationSummary,
  type GetGamificationSummaryInput,
} from "./gamification/use-cases/get-gamification-summary.use-case.js";
export {
  ListAchievementsUseCase,
  type AchievementList,
  type ListAchievementsInput,
} from "./gamification/use-cases/list-achievements.use-case.js";
export {
  ListPointTransactionsUseCase,
  type ListPointTransactionsInput,
  type PointTransactionsPage,
} from "./gamification/use-cases/list-point-transactions.use-case.js";
export {
  SubmitExerciseAnswerWithRewardsUseCase,
  type SubmitExerciseAnswerWithRewardsInput,
  type SubmitExerciseAnswerWithRewardsResult,
} from "./gamification/use-cases/submit-exercise-answer-with-rewards.use-case.js";
export {
  CompleteLessonWithRewardsUseCase,
  type CompleteLessonWithRewardsInput,
  type CompleteLessonWithRewardsResult,
} from "./gamification/use-cases/complete-lesson-with-rewards.use-case.js";

// Vocabulary (M9) — an entry is content (a file, grouped in a category of its language); what a
// student does with it is per-student state. See docs/adr/adr-022-vocabulary.md.
export type { VocabularyRepository } from "./vocabulary/ports/vocabulary-repository.js";
export type { UserVocabularyRepository } from "./vocabulary/ports/user-vocabulary-repository.js";
export type { VocabularyEventPublisher } from "./vocabulary/ports/vocabulary-event-publisher.js";
export { findVisibleVocabularyItem } from "./vocabulary/find-visible-vocabulary-item.js";
export {
  queryVisibleVocabulary,
  type VocabularyQueryEntry,
  type VocabularyQueryFilters,
  type VocabularyQueryResult,
} from "./vocabulary/query-vocabulary.js";
export { toUserStateView, type VocabularyUserStateView } from "./vocabulary/vocabulary-view.js";
export {
  GetVocabularyItemUseCase,
  type GetVocabularyItemInput,
  type VocabularyItemDetail,
} from "./vocabulary/use-cases/get-vocabulary-item.use-case.js";
export {
  ListVocabularyUseCase,
  type ListVocabularyInput,
  type VocabularyListEntry,
  type VocabularyListResult,
} from "./vocabulary/use-cases/list-vocabulary.use-case.js";
export {
  ListUserVocabularyUseCase,
  type ListUserVocabularyInput,
} from "./vocabulary/use-cases/list-user-vocabulary.use-case.js";
export {
  ListVocabularyCategoriesUseCase,
  type ListVocabularyCategoriesInput,
  type VocabularyCategoriesResult,
  type VocabularyCategoryView,
  type VocabularyProgressView,
} from "./vocabulary/use-cases/list-vocabulary-categories.use-case.js";
export {
  SaveVocabularyItemUseCase,
  type SaveVocabularyItemInput,
} from "./vocabulary/use-cases/save-vocabulary-item.use-case.js";
export {
  UnsaveVocabularyItemUseCase,
  type UnsaveVocabularyItemInput,
} from "./vocabulary/use-cases/unsave-vocabulary-item.use-case.js";
export {
  UpdateVocabularyStatusUseCase,
  type UpdateVocabularyStatusInput,
} from "./vocabulary/use-cases/update-vocabulary-status.use-case.js";
export {
  MarkVocabularyItemLearnedUseCase,
  type MarkVocabularyItemLearnedInput,
} from "./vocabulary/use-cases/mark-vocabulary-item-learned.use-case.js";

// Phonetics (M10) — a representation is content (a validated file, grouped in a topic of its
// language); a student's progress on it is per-student state. Independent of Vocabulary.
export type { PhoneticContentRepository } from "./phonetics/ports/phonetic-content-repository.js";
export type { UserPhoneticProgressRepository } from "./phonetics/ports/user-phonetic-progress-repository.js";
export { findVisiblePhoneticRepresentation } from "./phonetics/find-visible-phonetic-representation.js";
export {
  queryVisiblePhonetics,
  type PhoneticQueryEntry,
  type PhoneticQueryFilters,
  type PhoneticQueryResult,
} from "./phonetics/query-phonetics.js";
export {
  toPhoneticProgressView,
  type PhoneticUserProgressView,
} from "./phonetics/phonetic-progress-view.js";
export {
  GetPhoneticRepresentationUseCase,
  type GetPhoneticRepresentationInput,
  type PhoneticRepresentationDetail,
} from "./phonetics/use-cases/get-phonetic-representation.use-case.js";
export {
  ListPhoneticsUseCase,
  type ListPhoneticsInput,
  type PhoneticListEntry,
  type PhoneticListResult,
} from "./phonetics/use-cases/list-phonetics.use-case.js";
export {
  ListPhoneticTopicsUseCase,
  type ListPhoneticTopicsInput,
  type PhoneticTopicProgressView,
  type PhoneticTopicView,
  type PhoneticTopicsResult,
} from "./phonetics/use-cases/list-phonetic-topics.use-case.js";
export {
  RecordPhoneticViewUseCase,
  type RecordPhoneticViewInput,
} from "./phonetics/use-cases/record-phonetic-view.use-case.js";
export {
  RecordPhoneticPracticeUseCase,
  type RecordPhoneticPracticeInput,
} from "./phonetics/use-cases/record-phonetic-practice.use-case.js";
export {
  CompletePhoneticUseCase,
  type CompletePhoneticInput,
} from "./phonetics/use-cases/complete-phonetic.use-case.js";

// Video (M11) — a definition is content (what should be generated); a generation job is the
// per-student request to render it. The provider boundary (ADR-011/012) is
// `VideoGenerationService`: no Hyperframes (or any provider) type appears above it.
export type { VideoDefinitionRepository } from "./video/ports/video-definition-repository.js";
export type { VideoGenerationJobRepository } from "./video/ports/video-generation-job-repository.js";
export type {
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoGenerationService,
} from "./video/ports/video-generation-service.js";
export { VideoProviderUnavailableError } from "./video/errors/video-provider-unavailable.error.js";
export { VideoProviderRejectedError } from "./video/errors/video-provider-rejected.error.js";
export { VideoGenerationTimeoutError } from "./video/errors/video-generation-timeout.error.js";
export { findVisibleVideoDefinition } from "./video/find-visible-video-definition.js";
export {
  RequestVideoGenerationUseCase,
  type RequestVideoGenerationInput,
} from "./video/use-cases/request-video-generation.use-case.js";
export {
  GetVideoGenerationStatusUseCase,
  type GetVideoGenerationStatusInput,
} from "./video/use-cases/get-video-generation-status.use-case.js";

// Audio generation (M12) — the provider boundary (implemented in packages/data by
// FakeAudioGenerationService and GeminiAudioProvider), the reusable text-to-speech use case, and
// its first consumer (listening to a vocabulary entry). See ADR-013.
export type {
  AudioGenerationRequest,
  AudioGenerationService,
  GeneratedAudio,
} from "./audio/ports/audio-generation-service.js";
export type { AudioCache } from "./audio/ports/audio-cache.js";
export {
  AudioGenerationBusyError,
  AudioGenerationTimeoutError,
  AudioLanguageUnavailableError,
  AudioProviderConfigurationError,
  AudioProviderRateLimitedError,
  AudioProviderRejectedError,
  AudioProviderUnavailableError,
  AudioSourceTextMissingError,
  categorizeAudioGenerationError,
  type AudioGenerationFailureCategory,
} from "./audio/errors/audio-generation-errors.js";
export {
  GenerateAudioUseCase,
  type GenerateAudioInput,
  type GenerateAudioOptions,
  type GenerateAudioResult,
} from "./audio/use-cases/generate-audio.use-case.js";
export {
  GenerateVocabularyAudioUseCase,
  VOCABULARY_AUDIO_PARTS,
  type GenerateVocabularyAudioInput,
  type VocabularyAudioPart,
} from "./audio/use-cases/generate-vocabulary-audio.use-case.js";

// Teaching (M13) — the teacher dashboard: a read/aggregation capability over the authoritative
// lesson (M6), exercise (M7) and gamification (M8) records, scoped by teacher–student links.
// See ADR-024 and docs/architecture/teacher-dashboard.md.
export type {
  RosterPage,
  RosterQuery,
  RosterStudentRecord,
  StudentActivityQuery,
  StudentActivityRecord,
  StudentAttemptRecord,
  StudentLessonRecord,
  TeacherDashboardReadModel,
  TeacherOverviewTotals,
  WeeklyActivityRecord,
} from "./teaching/ports/teacher-dashboard-read-model.js";
export type { TeacherStudentLinkRepository } from "./teaching/ports/teacher-student-link-repository.js";
export {
  displayNameOf,
  toRosterStudentView,
  type RosterStudentView,
  type TeachingViewer,
} from "./teaching/views.js";
export { TeachingUserNotFoundError } from "./teaching/teaching-user-not-found.error.js";
export {
  GetTeacherOverviewUseCase,
  type GetTeacherOverviewInput,
  type TeacherOverview,
} from "./teaching/use-cases/get-teacher-overview.use-case.js";
export {
  ListTeacherStudentsUseCase,
  type ListTeacherStudentsInput,
  type TeacherStudentsPage,
} from "./teaching/use-cases/list-teacher-students.use-case.js";
export {
  DETAIL_WEEKS,
  GetTeacherStudentDetailUseCase,
  type GetTeacherStudentDetailDependencies,
  type GetTeacherStudentDetailInput,
  type LevelProgressView,
  type RecentAttemptView,
  type RecentLessonView,
  type TeacherStudentDetail,
  type UnlockedAchievementSummary,
  type WeeklyProgressView,
} from "./teaching/use-cases/get-teacher-student-detail.use-case.js";
export {
  LinkStudentToTeacherUseCase,
  PromoteUserToTeacherUseCase,
  UnlinkStudentFromTeacherUseCase,
} from "./teaching/use-cases/teacher-roster-admin.use-cases.js";

// Email (M14, ADR-014/ADR-025): a provider port, and two senders — transactional and marketing —
// that cannot be confused (different request/recipient types).
export { EmailDeliveryError } from "./email/email-delivery.error.js";
export {
  NEWSLETTER_CONFIRM_PAGE_PATH,
  ONE_CLICK_UNSUBSCRIBE_PATH,
  ProviderMarketingEmailSender,
  ProviderTransactionalEmailSender,
  UNSUBSCRIBE_PAGE_PATH,
  type EmailSenderConfig,
  type MarketingEmailSender,
  type TransactionalEmailRequest,
  type TransactionalEmailSender,
} from "./email/email-senders.js";
export type {
  EmailDeliveryEvent,
  EmailDeliveryObserver,
} from "./email/ports/email-delivery-observer.js";
export type { EmailProvider, OutgoingEmail } from "./email/ports/email-provider.js";
export type { UnsubscribeTokenCodec } from "./email/ports/unsubscribe-token-codec.js";
export { EmailTemplateError } from "./email/templates/email-template.error.js";
export {
  DEFAULT_EMAIL_LOCALE,
  EMAIL_LOCALES,
  type EmailLocale,
} from "./email/templates/messages.js";
export {
  renderEmail,
  type EmailRenderContext,
  type EmailTemplateRequest,
  type NewsletterIssueContent,
  type RenderedEmail,
} from "./email/templates/render-email.js";
export { TransactionalIdentityEmailService } from "./email/transactional-identity-email.service.js";

// Newsletter (M14, ADR-025): double opt-in, unsubscribe, and the issue-sending boundary.
export type {
  NewsletterSubscriptionRepository,
  SubscribedRecipient,
} from "./newsletter/ports/newsletter-subscription-repository.js";
export { NewsletterConsentVersionMismatchError } from "./newsletter/newsletter-consent-version-mismatch.error.js";
export {
  ConfirmNewsletterSubscriptionUseCase,
  GetEmailPreferencesUseCase,
  RequestNewsletterSubscriptionUseCase,
  UnsubscribeFromNewsletterUseCase,
  UnsubscribeWithTokenUseCase,
  type EmailPreferences,
  type RequestNewsletterSubscriptionInput,
  type RequestNewsletterSubscriptionResult,
} from "./newsletter/use-cases/newsletter-preferences.use-cases.js";
export {
  SendNewsletterIssueUseCase,
  type SendNewsletterIssueResult,
} from "./newsletter/use-cases/send-newsletter-issue.use-case.js";

// Privacy & Data Management (M15) — see ADR-026 and docs/privacy/.
export type {
  PersonalDataReadModel,
  PersonalDataRecords,
} from "./privacy/ports/personal-data-read-model.js";
export type { AccountErasureStore } from "./privacy/ports/account-erasure-store.js";
export {
  ExportPersonalDataUseCase,
  NOT_INCLUDED_IN_EXPORT,
  type ExportPersonalDataInput,
  type PersonalDataExport,
} from "./privacy/use-cases/export-personal-data.use-case.js";
export {
  DeleteAccountUseCase,
  type DeleteAccountInput,
  type DeleteAccountResult,
} from "./privacy/use-cases/delete-account.use-case.js";

// Educational media (M21) — the offline generation pipeline and the published-media read side.
// See ADR-031 and docs/m21-video-architecture.md.
export {
  ContentLanguage,
  FRAMING,
  InvalidVideoPlanError,
  LESSON_SCRIPT_VERSION,
  buildLessonVideoScript,
  speakableTranslation,
  type LessonFraming,
  type LessonScriptInput,
} from "./media/build-lesson-video-script.js";
export type {
  LessonVideoPlan,
  PlanBeat,
  PlanLine,
  PlanScene,
  VocabularyCategoryVideoPlan,
  VocabularyVisual,
} from "./media/video-plan.js";
export {
  VOCABULARY_SCRIPT_VERSION,
  buildVocabularyVideoScript,
  findVocabularyExample,
  type VocabularyExampleSource,
  type VocabularyScriptInput,
} from "./media/build-vocabulary-video-script.js";
export {
  LINE_GAP,
  SCENE_LEAD_IN,
  SCENE_TAIL,
  captionCues,
  planVideoTimeline,
  type TimedLine,
  type TimedScene,
  type VideoTimeline,
} from "./media/plan-video-timeline.js";
export {
  GenerateContentMediaUseCase,
  isAudioTarget,
  transcriptOf,
  type AnyMediaTarget,
  type AudioTarget,
  type GenerateContentMediaDependencies,
  type GenerateContentMediaInput,
  type MediaTarget,
  type PronunciationRequest,
  type TargetOutcome,
} from "./media/generate-content-media.use-case.js";
export type {
  ContentMediaCatalog,
  EducationalVideoRenderer,
  MediaManifestEntry,
  MediaManifestRepository,
  MediaRunStatus,
  NarrationClip,
  NarrationRequest,
  NarrationSynthesizer,
  RenderedVideo,
} from "./media/ports/media-generation-ports.js";

// Grammar reference (M23): read-only lookup topics.
export {
  GetGrammarTopicUseCase,
  ListGrammarTopicsUseCase,
  type GrammarReferenceRepository,
} from "./grammar/grammar-reference.js";

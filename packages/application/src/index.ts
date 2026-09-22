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

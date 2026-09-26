import type {
  ExerciseAnswerValue,
  NewsletterConsentSource,
  NewsletterStatus,
  RewardReason,
  Role,
  StoredLessonProgressStatus,
  StoredPhoneticProgressStatus,
  StoredVocabularyStatus,
  VideoGenerationStatus,
} from "@tfm-bic/domain";

/**
 * Everything the personal-data export may contain about one user (M15, ADR-026), read in one
 * consistent snapshot. Each record is an **allowlist**: the adapter selects exactly these
 * columns, so a password hash, a session or token hash, an unsubscribe key, a provider job
 * reference or a server file path can never reach the export — they are not in these types.
 */
export interface PersonalDataRecords {
  readonly account: {
    readonly userId: string;
    readonly email: string;
    readonly role: Role;
    readonly emailVerified: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  };
  readonly profile: {
    readonly firstName: string | null;
    readonly lastName: string | null;
    readonly nickname: string | null;
    readonly avatarId: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  } | null;
  readonly lessonProgress: readonly {
    readonly lessonId: string;
    readonly status: StoredLessonProgressStatus;
    readonly startedAt: Date;
    readonly completedAt: Date | null;
    readonly updatedAt: Date;
  }[];
  readonly exerciseAttempts: readonly {
    readonly exerciseId: string;
    readonly submittedAnswer: ExerciseAnswerValue;
    readonly correct: boolean;
    readonly answeredAt: Date;
  }[];
  readonly vocabulary: readonly {
    readonly vocabularyItemId: string;
    readonly status: StoredVocabularyStatus;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly learnedAt: Date | null;
  }[];
  readonly phonetics: readonly {
    readonly phoneticRepresentationId: string;
    readonly status: StoredPhoneticProgressStatus;
    readonly firstViewedAt: Date;
    readonly lastViewedAt: Date;
    readonly practicedAt: Date | null;
    readonly completedAt: Date | null;
  }[];
  readonly pointTransactions: readonly {
    readonly reason: RewardReason;
    readonly sourceId: string;
    readonly amount: number;
    readonly createdAt: Date;
  }[];
  readonly achievements: readonly { readonly achievementKey: string; readonly unlockedAt: Date }[];
  readonly videoGenerationJobs: readonly {
    readonly jobId: string;
    readonly videoDefinitionId: string;
    readonly status: VideoGenerationStatus;
    readonly errorCategory: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly completedAt: Date | null;
  }[];
  readonly newsletter: {
    readonly status: NewsletterStatus;
    readonly consentVersion: string;
    readonly consentSource: NewsletterConsentSource;
    readonly requestedAt: Date;
    readonly confirmedAt: Date | null;
    readonly unsubscribedAt: Date | null;
  } | null;
  /** Links where this user is the student. The teacher's identity is not included (ADR-026). */
  readonly teacherLinks: readonly { readonly linkedAt: Date }[];
  /** How many students are linked to this user as their teacher — a count, never their data. */
  readonly linkedStudentCount: number;
}

/** Reads one user's records for the export. `null` when the account does not exist. */
export interface PersonalDataReadModel {
  load(userId: string): Promise<PersonalDataRecords | null>;
}

import type { PersonalDataReadModel, PersonalDataRecords } from "@tfm-bic/application";
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
import { sql, type SQL } from "drizzle-orm";

import type { PrivacyDb } from "./db/client.js";

type Row = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const date = (value: unknown): Date =>
  value instanceof Date ? value : new Date(value as string | number);
const dateOrNull = (value: unknown): Date | null =>
  value === null || value === undefined ? null : date(value);
const textOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);
const text = (value: unknown): string => String(value);

/** `submitted_answer` is jsonb; every type stores a string or a boolean (ADR-020). */
function answer(value: unknown): ExerciseAnswerValue {
  return typeof value === "boolean" ? value : String(value);
}

/**
 * The personal-data export's reads (M15, ADR-026): a fixed number of statements (one per store,
 * whatever the volume), each selecting an **explicit column list** filtered by the one user id —
 * never `SELECT *`, so a password hash, token hash, unsubscribe key, provider job reference or
 * server path is never read. All reads run in one `REPEATABLE READ, READ ONLY` transaction, so
 * the export is a consistent snapshot even while the user keeps learning in another tab.
 */
export class SqlPersonalDataReadModel implements PersonalDataReadModel {
  constructor(private readonly db: PrivacyDb) {}

  async load(userId: string): Promise<PersonalDataRecords | null> {
    if (!UUID_PATTERN.test(userId)) {
      return null;
    }
    return this.db.transaction(
      async (tx) => {
        const rows = async (query: SQL): Promise<Row[]> => (await tx.execute(query)).rows;
        const id = sql`${userId}::uuid`;

        const [account] = await rows(sql`
          SELECT id, email, role, email_verified, created_at, updated_at
          FROM users WHERE id = ${id}`);
        if (account === undefined) {
          return null;
        }
        const [profile] = await rows(sql`
          SELECT first_name, last_name, nickname, avatar_id, created_at, updated_at
          FROM student_profiles WHERE user_id = ${id}`);
        const lessons = await rows(sql`
          SELECT lesson_id, status, started_at, completed_at, updated_at
          FROM lesson_progress WHERE user_id = ${id} ORDER BY started_at, lesson_id`);
        const attempts = await rows(sql`
          SELECT exercise_id, submitted_answer, correct, answered_at
          FROM exercise_attempts WHERE user_id = ${id} ORDER BY id`);
        const vocabulary = await rows(sql`
          SELECT vocabulary_item_id, status, created_at, updated_at, learned_at
          FROM user_vocabulary WHERE user_id = ${id} ORDER BY created_at, vocabulary_item_id`);
        const phonetics = await rows(sql`
          SELECT phonetic_representation_id, status, first_viewed_at, last_viewed_at,
                 practiced_at, completed_at
          FROM user_phonetic_progress WHERE user_id = ${id}
          ORDER BY first_viewed_at, phonetic_representation_id`);
        const points = await rows(sql`
          SELECT reason, source_id, amount, created_at
          FROM point_transactions WHERE user_id = ${id} ORDER BY id`);
        const achievements = await rows(sql`
          SELECT achievement_key, unlocked_at
          FROM user_achievements WHERE user_id = ${id} ORDER BY unlocked_at, achievement_key`);
        const videoJobs = await rows(sql`
          SELECT id, video_definition_id, status, error_category, created_at, updated_at, completed_at
          FROM video_generation_jobs WHERE user_id = ${id} ORDER BY created_at, id`);
        const [newsletter] = await rows(sql`
          SELECT status, consent_version, consent_source, requested_at, confirmed_at, unsubscribed_at
          FROM newsletter_subscriptions WHERE user_id = ${id}`);
        const teacherLinks = await rows(sql`
          SELECT linked_at FROM teacher_students WHERE student_id = ${id} ORDER BY linked_at`);
        const [studentCount] = await rows(sql`
          SELECT count(*)::int AS n FROM teacher_students WHERE teacher_id = ${id}`);

        return {
          account: {
            userId: text(account.id),
            email: text(account.email),
            role: account.role as Role,
            emailVerified: account.email_verified === true,
            createdAt: date(account.created_at),
            updatedAt: date(account.updated_at),
          },
          profile:
            profile === undefined
              ? null
              : {
                  firstName: textOrNull(profile.first_name),
                  lastName: textOrNull(profile.last_name),
                  nickname: textOrNull(profile.nickname),
                  avatarId: textOrNull(profile.avatar_id),
                  createdAt: date(profile.created_at),
                  updatedAt: date(profile.updated_at),
                },
          lessonProgress: lessons.map((row) => ({
            lessonId: text(row.lesson_id),
            status: row.status as StoredLessonProgressStatus,
            startedAt: date(row.started_at),
            completedAt: dateOrNull(row.completed_at),
            updatedAt: date(row.updated_at),
          })),
          exerciseAttempts: attempts.map((row) => ({
            exerciseId: text(row.exercise_id),
            submittedAnswer: answer(row.submitted_answer),
            correct: row.correct === true,
            answeredAt: date(row.answered_at),
          })),
          vocabulary: vocabulary.map((row) => ({
            vocabularyItemId: text(row.vocabulary_item_id),
            status: row.status as StoredVocabularyStatus,
            createdAt: date(row.created_at),
            updatedAt: date(row.updated_at),
            learnedAt: dateOrNull(row.learned_at),
          })),
          phonetics: phonetics.map((row) => ({
            phoneticRepresentationId: text(row.phonetic_representation_id),
            status: row.status as StoredPhoneticProgressStatus,
            firstViewedAt: date(row.first_viewed_at),
            lastViewedAt: date(row.last_viewed_at),
            practicedAt: dateOrNull(row.practiced_at),
            completedAt: dateOrNull(row.completed_at),
          })),
          pointTransactions: points.map((row) => ({
            reason: row.reason as RewardReason,
            sourceId: text(row.source_id),
            amount: Number(row.amount),
            createdAt: date(row.created_at),
          })),
          achievements: achievements.map((row) => ({
            achievementKey: text(row.achievement_key),
            unlockedAt: date(row.unlocked_at),
          })),
          videoGenerationJobs: videoJobs.map((row) => ({
            jobId: text(row.id),
            videoDefinitionId: text(row.video_definition_id),
            status: row.status as VideoGenerationStatus,
            errorCategory: textOrNull(row.error_category),
            createdAt: date(row.created_at),
            updatedAt: date(row.updated_at),
            completedAt: dateOrNull(row.completed_at),
          })),
          newsletter:
            newsletter === undefined
              ? null
              : {
                  status: newsletter.status as NewsletterStatus,
                  consentVersion: text(newsletter.consent_version),
                  consentSource: newsletter.consent_source as NewsletterConsentSource,
                  requestedAt: date(newsletter.requested_at),
                  confirmedAt: dateOrNull(newsletter.confirmed_at),
                  unsubscribedAt: dateOrNull(newsletter.unsubscribed_at),
                },
          teacherLinks: teacherLinks.map((row) => ({ linkedAt: date(row.linked_at) })),
          linkedStudentCount: Number(studentCount?.n ?? 0),
        };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
  }
}

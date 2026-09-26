import { PERSONAL_DATA_EXPORT_VERSION, ROLES } from "@tfm-bic/domain";
import { z } from "zod";

/**
 * Privacy & Data Management (M15, ADR-026). The export document and the account-deletion body.
 *
 * The export schema is the last allowlist before the wire: `z.object` strips anything outside
 * the documented shape (docs/privacy/DATA-EXPORT-FORMAT.md), so even a mapping mistake upstream
 * could not serialize a credential.
 */

const iso = z.iso.datetime();
const isoOrNull = iso.nullable();

export const personalDataExportSchema = z.object({
  exportVersion: z.literal(PERSONAL_DATA_EXPORT_VERSION),
  generatedAt: iso,
  account: z.object({
    userId: z.uuid(),
    email: z.string(),
    role: z.enum(ROLES),
    emailVerified: z.boolean(),
    createdAt: iso,
    updatedAt: iso,
  }),
  profile: z
    .object({
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      nickname: z.string().nullable(),
      avatarId: z.string().nullable(),
      createdAt: iso,
      updatedAt: iso,
    })
    .nullable(),
  learning: z.object({
    lessons: z.array(
      z.object({
        lessonId: z.string(),
        status: z.string(),
        startedAt: iso,
        completedAt: isoOrNull,
        updatedAt: iso,
      }),
    ),
    exerciseAttempts: z.array(
      z.object({
        exerciseId: z.string(),
        submittedAnswer: z.union([z.string(), z.boolean()]),
        correct: z.boolean(),
        answeredAt: iso,
      }),
    ),
  }),
  vocabulary: z.object({
    items: z.array(
      z.object({
        vocabularyItemId: z.string(),
        status: z.string(),
        createdAt: iso,
        updatedAt: iso,
        learnedAt: isoOrNull,
      }),
    ),
  }),
  phonetics: z.object({
    items: z.array(
      z.object({
        phoneticRepresentationId: z.string(),
        status: z.string(),
        firstViewedAt: iso,
        lastViewedAt: iso,
        practicedAt: isoOrNull,
        completedAt: isoOrNull,
      }),
    ),
  }),
  gamification: z.object({
    totalPoints: z.number().int().min(0),
    pointTransactions: z.array(
      z.object({
        reason: z.string(),
        sourceId: z.string(),
        amount: z.number().int(),
        createdAt: iso,
      }),
    ),
    achievements: z.array(z.object({ key: z.string(), unlockedAt: iso })),
  }),
  media: z.object({
    videoGenerationJobs: z.array(
      z.object({
        jobId: z.uuid(),
        videoDefinitionId: z.string(),
        status: z.string(),
        errorCategory: z.string().nullable(),
        createdAt: iso,
        updatedAt: iso,
        completedAt: isoOrNull,
      }),
    ),
  }),
  communication: z.object({
    essentialEmails: z.literal("always-on"),
    newsletter: z
      .object({
        status: z.string(),
        consentVersion: z.string(),
        consentSource: z.string(),
        requestedAt: iso,
        confirmedAt: isoOrNull,
        unsubscribedAt: isoOrNull,
      })
      .nullable(),
  }),
  teaching: z.object({
    linkedTeachers: z.array(z.object({ linkedAt: iso })),
    linkedStudentCount: z.number().int().min(0),
  }),
  notIncluded: z.array(z.string()),
});

export type PersonalDataExportResponse = z.infer<typeof personalDataExportSchema>;

/**
 * Account deletion: the current password, re-entered, and an explicit `confirm: true`. Strict —
 * there is no user id or email: the account is always the session's (ADR-026). The password
 * bounds match the login request's.
 */
export const deleteAccountRequestSchema = z.strictObject({
  password: z.string().min(1).max(128),
  confirm: z.literal(true),
});

export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;

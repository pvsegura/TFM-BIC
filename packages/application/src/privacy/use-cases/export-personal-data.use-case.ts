import { PERSONAL_DATA_EXPORT_VERSION, type Role } from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type {
  PersonalDataReadModel,
  PersonalDataRecords,
} from "../ports/personal-data-read-model.js";

/**
 * Categories of stored data that the export deliberately leaves out, stated in the export itself
 * so a reader knows they exist and why they are absent (docs/privacy/DATA-EXPORT-FORMAT.md).
 */
export const NOT_INCLUDED_IN_EXPORT = [
  "Your password hash (a one-way credential derivative, never readable).",
  "Session, email-verification and password-reset token hashes (security credentials).",
  "The newsletter unsubscribe key and confirmation token hash (security credentials).",
  "The identity of teachers linked to your account, and the data of students linked to it (other people's data).",
  "Internal provider job references and server file paths of generated media (infrastructure data).",
  "Server logs (kept by the hosting platform, not in the application database).",
] as const;

export interface ExportPersonalDataInput {
  /** Always the session's user — never a value taken from the request. */
  userId: string;
}

type Iso = string;
const iso = (value: Date): Iso => value.toISOString();
const isoOrNull = (value: Date | null): Iso | null => (value === null ? null : iso(value));

/** The export document (version `PERSONAL_DATA_EXPORT_VERSION`). */
export interface PersonalDataExport {
  exportVersion: string;
  generatedAt: Iso;
  account: {
    userId: string;
    email: string;
    role: Role;
    emailVerified: boolean;
    createdAt: Iso;
    updatedAt: Iso;
  };
  profile: {
    firstName: string | null;
    lastName: string | null;
    nickname: string | null;
    avatarId: string | null;
    createdAt: Iso;
    updatedAt: Iso;
  } | null;
  learning: {
    lessons: {
      lessonId: string;
      status: string;
      startedAt: Iso;
      completedAt: Iso | null;
      updatedAt: Iso;
    }[];
    exerciseAttempts: {
      exerciseId: string;
      submittedAnswer: string | boolean;
      correct: boolean;
      answeredAt: Iso;
    }[];
  };
  vocabulary: {
    items: {
      vocabularyItemId: string;
      status: string;
      createdAt: Iso;
      updatedAt: Iso;
      learnedAt: Iso | null;
    }[];
  };
  phonetics: {
    items: {
      phoneticRepresentationId: string;
      status: string;
      firstViewedAt: Iso;
      lastViewedAt: Iso;
      practicedAt: Iso | null;
      completedAt: Iso | null;
    }[];
  };
  gamification: {
    totalPoints: number;
    pointTransactions: { reason: string; sourceId: string; amount: number; createdAt: Iso }[];
    achievements: { key: string; unlockedAt: Iso }[];
  };
  media: {
    videoGenerationJobs: {
      jobId: string;
      videoDefinitionId: string;
      status: string;
      errorCategory: string | null;
      createdAt: Iso;
      updatedAt: Iso;
      completedAt: Iso | null;
    }[];
  };
  communication: {
    /** Transactional email cannot be switched off (M14); stated, not stored. */
    essentialEmails: "always-on";
    newsletter: {
      status: string;
      consentVersion: string;
      consentSource: string;
      requestedAt: Iso;
      confirmedAt: Iso | null;
      unsubscribedAt: Iso | null;
    } | null;
  };
  teaching: {
    linkedTeachers: { linkedAt: Iso }[];
    linkedStudentCount: number;
  };
  notIncluded: string[];
}

function toExport(records: PersonalDataRecords, generatedAt: Date): PersonalDataExport {
  const { account, profile, newsletter } = records;
  return {
    exportVersion: PERSONAL_DATA_EXPORT_VERSION,
    generatedAt: iso(generatedAt),
    account: {
      userId: account.userId,
      email: account.email,
      role: account.role,
      emailVerified: account.emailVerified,
      createdAt: iso(account.createdAt),
      updatedAt: iso(account.updatedAt),
    },
    profile:
      profile === null
        ? null
        : {
            firstName: profile.firstName,
            lastName: profile.lastName,
            nickname: profile.nickname,
            avatarId: profile.avatarId,
            createdAt: iso(profile.createdAt),
            updatedAt: iso(profile.updatedAt),
          },
    learning: {
      lessons: records.lessonProgress.map((row) => ({
        lessonId: row.lessonId,
        status: row.status,
        startedAt: iso(row.startedAt),
        completedAt: isoOrNull(row.completedAt),
        updatedAt: iso(row.updatedAt),
      })),
      exerciseAttempts: records.exerciseAttempts.map((row) => ({
        exerciseId: row.exerciseId,
        submittedAnswer: row.submittedAnswer,
        correct: row.correct,
        answeredAt: iso(row.answeredAt),
      })),
    },
    vocabulary: {
      items: records.vocabulary.map((row) => ({
        vocabularyItemId: row.vocabularyItemId,
        status: row.status,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        learnedAt: isoOrNull(row.learnedAt),
      })),
    },
    phonetics: {
      items: records.phonetics.map((row) => ({
        phoneticRepresentationId: row.phoneticRepresentationId,
        status: row.status,
        firstViewedAt: iso(row.firstViewedAt),
        lastViewedAt: iso(row.lastViewedAt),
        practicedAt: isoOrNull(row.practicedAt),
        completedAt: isoOrNull(row.completedAt),
      })),
    },
    gamification: {
      // Derived from the ledger, as everywhere else (M8): never a stored total.
      totalPoints: records.pointTransactions.reduce((sum, row) => sum + row.amount, 0),
      pointTransactions: records.pointTransactions.map((row) => ({
        reason: row.reason,
        sourceId: row.sourceId,
        amount: row.amount,
        createdAt: iso(row.createdAt),
      })),
      achievements: records.achievements.map((row) => ({
        key: row.achievementKey,
        unlockedAt: iso(row.unlockedAt),
      })),
    },
    media: {
      videoGenerationJobs: records.videoGenerationJobs.map((row) => ({
        jobId: row.jobId,
        videoDefinitionId: row.videoDefinitionId,
        status: row.status,
        errorCategory: row.errorCategory,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        completedAt: isoOrNull(row.completedAt),
      })),
    },
    communication: {
      essentialEmails: "always-on",
      newsletter:
        newsletter === null
          ? null
          : {
              status: newsletter.status,
              consentVersion: newsletter.consentVersion,
              consentSource: newsletter.consentSource,
              requestedAt: iso(newsletter.requestedAt),
              confirmedAt: isoOrNull(newsletter.confirmedAt),
              unsubscribedAt: isoOrNull(newsletter.unsubscribedAt),
            },
    },
    teaching: {
      linkedTeachers: records.teacherLinks.map((row) => ({ linkedAt: iso(row.linkedAt) })),
      linkedStudentCount: records.linkedStudentCount,
    },
    notIncluded: [...NOT_INCLUDED_IN_EXPORT],
  };
}

/**
 * Builds the user's personal-data export (M15, ADR-026): access and portability as a
 * self-service, server-generated JSON document. Every field is mapped one by one from the read
 * model's allowlisted records — nothing is spread, so a column added to a table later cannot
 * leak into the export without a deliberate change here and in the contract.
 */
export class ExportPersonalDataUseCase {
  constructor(
    private readonly readModel: PersonalDataReadModel,
    private readonly clock: Clock,
  ) {}

  async execute(input: ExportPersonalDataInput): Promise<PersonalDataExport | null> {
    const records = await this.readModel.load(input.userId);
    return records === null ? null : toExport(records, this.clock.now());
  }
}

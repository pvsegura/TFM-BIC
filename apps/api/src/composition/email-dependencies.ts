import { randomBytes } from "node:crypto";

import type {
  Clock,
  EmailProvider,
  NewsletterSubscriptionRepository,
  TokenGenerator,
  UnsubscribeTokenCodec,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  createNewsletterDb,
  CryptoTokenGenerator,
  DrizzleNewsletterSubscriptionRepository,
  FakeEmailProvider,
  HmacUnsubscribeTokenCodec,
  SystemClock,
  type NewsletterDb,
} from "@tfm-bic/data";
import type { EmailCategory, EmailTemplateId } from "@tfm-bic/domain";

/** What the NODE_ENV=test inbox route reads — a narrow structural view of `FakeEmailProvider`. */
export interface EmailInbox {
  findLastSentTo(
    to: string,
    template?: EmailTemplateId,
  ):
    | {
        template: EmailTemplateId;
        category: EmailCategory;
        subject: string;
        links: readonly string[];
        listUnsubscribeUrl: string | null;
      }
    | undefined;
}

/**
 * Email and newsletter (M14, ADR-014/ADR-025): the provider, the unsubscribe-link signer, the
 * consent records, and the clock/token generator the newsletter use cases need. Composition-root
 * wiring only, excluded from coverage like the other `*-dependencies.ts` files.
 */
export interface EmailDependencies {
  provider: EmailProvider;
  unsubscribeTokens: UnsubscribeTokenCodec;
  subscriptionRepository: NewsletterSubscriptionRepository;
  tokenGenerator: TokenGenerator;
  clock: Clock;
  /** Only the E2E composition sets this; the inbox route also requires NODE_ENV=test. */
  inbox?: EmailInbox;
  /** Registers the NODE_ENV=test-only route that sends a newsletter issue (E2E only). */
  enableTestSupportRoutes?: boolean;
  close: () => Promise<void>;
}

/**
 * `EMAIL_PROVIDER` → adapter. Only "fake" exists: nothing is sent anywhere, in any environment,
 * until a real provider is selected (ADR-014 PENDING) and added here and to packages/config.
 */
export function selectEmailProvider(env: AppEnv): FakeEmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "fake":
      return new FakeEmailProvider();
  }
}

/** Required in production/staging (loadEnv); an ephemeral secret elsewhere — dev/test links need
 * not survive a restart. */
export function createUnsubscribeTokenCodec(env: AppEnv): UnsubscribeTokenCodec {
  return new HmacUnsubscribeTokenCodec(env.EMAIL_LINK_SECRET ?? randomBytes(32).toString("hex"));
}

export function buildEmailDependencies(
  db: NewsletterDb,
  env: AppEnv,
  close: () => Promise<void>,
  options: { exposeInbox?: boolean; enableTestSupportRoutes?: boolean } = {},
): EmailDependencies {
  const provider = selectEmailProvider(env);
  return {
    provider,
    unsubscribeTokens: createUnsubscribeTokenCodec(env),
    subscriptionRepository: new DrizzleNewsletterSubscriptionRepository(db),
    tokenGenerator: new CryptoTokenGenerator(),
    clock: new SystemClock(),
    ...(options.exposeInbox ? { inbox: provider } : {}),
    ...(options.enableTestSupportRoutes ? { enableTestSupportRoutes: true } : {}),
    close,
  };
}

/** The real composition over `DATABASE_URL`. Never exposes the inbox. */
export function createEmailDependencies(databaseUrl: string, env: AppEnv): EmailDependencies {
  const { db, close } = createNewsletterDb(databaseUrl);
  return buildEmailDependencies(db, env, close);
}

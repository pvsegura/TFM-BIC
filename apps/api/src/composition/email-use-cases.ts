import {
  ConfirmNewsletterSubscriptionUseCase,
  DEFAULT_EMAIL_LOCALE,
  GetEmailPreferencesUseCase,
  ProviderMarketingEmailSender,
  ProviderTransactionalEmailSender,
  RequestNewsletterSubscriptionUseCase,
  SendNewsletterIssueUseCase,
  TransactionalIdentityEmailService,
  UnsubscribeFromNewsletterUseCase,
  UnsubscribeWithTokenUseCase,
  type EmailDeliveryObserver,
  type EmailSenderConfig,
  type EmailService,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";

import type { EmailDependencies } from "./email-dependencies.js";

export interface EmailUseCases {
  /** M3's identity email port, now backed by the transactional sender. */
  identityEmailService: EmailService;
  getPreferences: GetEmailPreferencesUseCase;
  requestSubscription: RequestNewsletterSubscriptionUseCase;
  confirmSubscription: ConfirmNewsletterSubscriptionUseCase;
  unsubscribe: UnsubscribeFromNewsletterUseCase;
  unsubscribeWithToken: UnsubscribeWithTokenUseCase;
  sendIssue: SendNewsletterIssueUseCase;
}

/**
 * Composition-root wiring only. The two senders share the provider but nothing else: the
 * transactional one serves identity and the double opt-in confirmation; the marketing one is
 * reachable only through `SendNewsletterIssueUseCase`, which addresses confirmed subscriptions.
 */
export function createEmailUseCases(
  deps: EmailDependencies,
  env: AppEnv,
  observer: EmailDeliveryObserver,
): EmailUseCases {
  const config: EmailSenderConfig = {
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO ?? null,
    appBaseUrl: env.APP_BASE_URL,
    locale: DEFAULT_EMAIL_LOCALE,
  };
  const transactional = new ProviderTransactionalEmailSender(deps.provider, config, observer);
  const marketing = new ProviderMarketingEmailSender(
    deps.provider,
    config,
    deps.unsubscribeTokens,
    observer,
  );
  const repository = deps.subscriptionRepository;

  return {
    identityEmailService: new TransactionalIdentityEmailService(transactional),
    getPreferences: new GetEmailPreferencesUseCase(repository),
    requestSubscription: new RequestNewsletterSubscriptionUseCase(
      repository,
      deps.tokenGenerator,
      transactional,
      deps.clock,
      env.APP_BASE_URL,
    ),
    confirmSubscription: new ConfirmNewsletterSubscriptionUseCase(
      repository,
      deps.tokenGenerator,
      deps.clock,
    ),
    unsubscribe: new UnsubscribeFromNewsletterUseCase(repository, deps.clock),
    unsubscribeWithToken: new UnsubscribeWithTokenUseCase(
      repository,
      deps.unsubscribeTokens,
      deps.clock,
    ),
    sendIssue: new SendNewsletterIssueUseCase(repository, marketing),
  };
}

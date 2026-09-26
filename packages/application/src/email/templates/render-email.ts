import type { EmailTemplateId } from "@tfm-bic/domain";

import { EmailTemplateError } from "./email-template.error.js";
import { escapeHtml } from "./escape-html.js";
import { EMAIL_MESSAGES, type EmailLocale, type EmailMessages } from "./messages.js";

/** Plain-text newsletter content. No HTML is accepted: every field is escaped when rendered. */
export interface NewsletterIssueContent {
  readonly subject: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
}

/** A named template and its variables — the only way application code describes an email. */
export type EmailTemplateRequest =
  | { template: "email-verification"; variables: { verificationUrl: string } }
  | { template: "password-reset"; variables: { resetUrl: string } }
  | { template: "newsletter-confirmation"; variables: { confirmationUrl: string } }
  | {
      template: "newsletter-issue";
      variables: NewsletterIssueContent & { unsubscribeUrl: string };
    };

export interface EmailRenderContext {
  /** Every link must point at this origin (the configured app URL, never a request's Host). */
  readonly appBaseUrl: string;
  readonly locale: EmailLocale;
}

export interface RenderedEmail {
  readonly template: EmailTemplateId;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

const MAX_SUBJECT_LENGTH = 150;
const MAX_TITLE_LENGTH = 150;
const MAX_PARAGRAPHS = 20;
const MAX_PARAGRAPH_LENGTH = 2000;
// Characters that have no business in a link we generate, and that could break out of an
// attribute or a header if they ever reached one unescaped.
// eslint-disable-next-line no-control-regex -- control characters are exactly what is refused
const UNSAFE_LINK_CHARACTERS = /[\s"'<>\\`\u0000-\u001f\u007f]/;
// eslint-disable-next-line no-control-regex -- control characters are exactly what is refused
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

// scheme://authority, then end or a path/query/fragment. No user-info ("@") is accepted, so
// "https://app.example.com@evil.net" cannot pass as the app's origin.
const ORIGIN_PATTERN = /^(https?):\/\/([^/?#@]+)(?=$|[/?#])/i;

/** `scheme://host[:port]`, lower-cased, or `null` if `url` is not an absolute http(s) URL. This
 * package runs without DOM or Node types, so it does not rely on the `URL` global. */
function originOf(url: string): string | null {
  const match = ORIGIN_PATTERN.exec(url);
  return match ? `${match[1]}://${match[2]}`.toLowerCase() : null;
}

function assertAppLink(url: string, appBaseUrl: string, name: string): string {
  if (UNSAFE_LINK_CHARACTERS.test(url)) {
    throw new EmailTemplateError(`${name} contains characters a link may not contain`);
  }
  const origin = originOf(url);
  if (origin === null) {
    throw new EmailTemplateError(`${name} is not an absolute http(s) URL`);
  }
  if (origin !== originOf(appBaseUrl)) {
    throw new EmailTemplateError(`${name} does not point at the application`);
  }
  return url;
}

function assertLine(value: string, name: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength || CONTROL_CHARACTERS.test(trimmed)) {
    throw new EmailTemplateError(`${name} must be 1–${maxLength} characters on one line`);
  }
  return trimmed;
}

function assertParagraphs(paragraphs: readonly string[]): string[] {
  if (paragraphs.length === 0 || paragraphs.length > MAX_PARAGRAPHS) {
    throw new EmailTemplateError(`a newsletter needs 1–${MAX_PARAGRAPHS} paragraphs`);
  }
  return paragraphs.map((paragraph) => {
    const trimmed = paragraph.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_PARAGRAPH_LENGTH) {
      throw new EmailTemplateError(
        `each paragraph must be 1–${MAX_PARAGRAPH_LENGTH} characters long`,
      );
    }
    return trimmed;
  });
}

interface LayoutInput {
  readonly locale: EmailLocale;
  readonly messages: EmailMessages;
  readonly subject: string;
  readonly heading: string;
  readonly bodyHtml: string;
  readonly footerHtml: string;
}

/** One shared, table-free, inline-styled layout. Callers pass already-escaped fragments. */
function layout(input: LayoutInput): string {
  return [
    "<!doctype html>",
    `<html lang="${input.locale}">`,
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(input.subject)}</title></head>`,
    '<body style="margin:0;padding:24px;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:24px;border-radius:8px">',
    `<p style="margin:0 0 16px;font-weight:bold;color:#c2410c">${escapeHtml(input.messages.productName)}</p>`,
    `<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(input.heading)}</h1>`,
    input.bodyHtml,
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">`,
    `<div style="font-size:12px;color:#6b7280">${input.footerHtml}</div>`,
    "</div></body></html>",
  ].join("\n");
}

function actionEmail(
  context: EmailRenderContext,
  template: EmailTemplateId,
  copy: EmailMessages["emailVerification"],
  url: string,
): RenderedEmail {
  const messages = EMAIL_MESSAGES[context.locale];
  const href = escapeHtml(url);
  const bodyHtml = [
    `<p>${escapeHtml(copy.body)}</p>`,
    `<p><a href="${href}" style="display:inline-block;padding:10px 16px;background:#c2410c;color:#ffffff;text-decoration:none;border-radius:6px">${escapeHtml(copy.action)}</a></p>`,
    `<p style="font-size:13px">${escapeHtml(messages.linkFallback)}<br><a href="${href}">${href}</a></p>`,
    `<p style="font-size:13px">${escapeHtml(copy.note)}</p>`,
  ].join("\n");
  return {
    template,
    subject: copy.subject,
    html: layout({
      locale: context.locale,
      messages,
      subject: copy.subject,
      heading: copy.heading,
      bodyHtml,
      footerHtml: escapeHtml(messages.footerTransactional),
    }),
    text: [
      copy.heading,
      "",
      copy.body,
      "",
      `${copy.action}: ${url}`,
      "",
      copy.note,
      "",
      "--",
      messages.footerTransactional,
    ].join("\n"),
  };
}

function newsletterIssue(
  context: EmailRenderContext,
  variables: NewsletterIssueContent & { unsubscribeUrl: string },
): RenderedEmail {
  const messages = EMAIL_MESSAGES[context.locale];
  const subject = assertLine(variables.subject, "the subject", MAX_SUBJECT_LENGTH);
  const title = assertLine(variables.title, "the title", MAX_TITLE_LENGTH);
  const paragraphs = assertParagraphs(variables.paragraphs);
  const unsubscribeUrl = assertAppLink(
    variables.unsubscribeUrl,
    context.appBaseUrl,
    "the unsubscribe link",
  );
  const href = escapeHtml(unsubscribeUrl);

  return {
    template: "newsletter-issue",
    subject,
    html: layout({
      locale: context.locale,
      messages,
      subject,
      heading: title,
      bodyHtml: paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n"),
      footerHtml: `${escapeHtml(messages.footerMarketing)}<br><a href="${href}">${escapeHtml(messages.unsubscribeLabel)}</a>`,
    }),
    text: [
      title,
      "",
      paragraphs.join("\n\n"),
      "",
      "--",
      messages.footerMarketing,
      `${messages.unsubscribeLabel}: ${unsubscribeUrl}`,
    ].join("\n"),
  };
}

/** Renders a named template. Throws `EmailTemplateError` for any invalid variable. */
export function renderEmail(
  request: EmailTemplateRequest,
  context: EmailRenderContext,
): RenderedEmail {
  const messages = EMAIL_MESSAGES[context.locale];
  switch (request.template) {
    case "email-verification":
      return actionEmail(
        context,
        request.template,
        messages.emailVerification,
        assertAppLink(
          request.variables.verificationUrl,
          context.appBaseUrl,
          "the verification link",
        ),
      );
    case "password-reset":
      return actionEmail(
        context,
        request.template,
        messages.passwordReset,
        assertAppLink(request.variables.resetUrl, context.appBaseUrl, "the reset link"),
      );
    case "newsletter-confirmation":
      return actionEmail(
        context,
        request.template,
        messages.newsletterConfirmation,
        assertAppLink(
          request.variables.confirmationUrl,
          context.appBaseUrl,
          "the confirmation link",
        ),
      );
    case "newsletter-issue":
      return newsletterIssue(context, request.variables);
  }
}

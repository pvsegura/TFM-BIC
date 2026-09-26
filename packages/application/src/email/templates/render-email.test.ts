import { describe, expect, it } from "vitest";

import { EmailTemplateError } from "./email-template.error.js";
import { escapeHtml } from "./escape-html.js";
import { renderEmail, type EmailRenderContext } from "./render-email.js";

const CONTEXT: EmailRenderContext = { appBaseUrl: "https://app.example.com", locale: "en" };

describe("escapeHtml", () => {
  it("escapes every character that can open markup or break out of an attribute", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
  });
});

describe("renderEmail — transactional templates", () => {
  it("renders the verification email with its link in both the HTML and the text part", () => {
    const url = "https://app.example.com/verify-email?token=abc123";
    const email = renderEmail(
      { template: "email-verification", variables: { verificationUrl: url } },
      CONTEXT,
    );

    expect(email.subject).toBe("Verify your email address");
    expect(email.html).toContain(`href="${url}"`);
    expect(email.text).toContain(url);
    expect(email.html).toContain("24 hours");
    expect(email.html).not.toMatch(/unsubscribe/i);
  });

  it("renders the password reset email with its link and a note for people who did not ask", () => {
    const url = "https://app.example.com/reset-password?token=r3s3t";
    const email = renderEmail(
      { template: "password-reset", variables: { resetUrl: url } },
      CONTEXT,
    );

    expect(email.subject).toBe("Reset your password");
    expect(email.html).toContain(`href="${url}"`);
    expect(email.text).toContain(url);
    expect(email.text).toMatch(/did not request/i);
    expect(email.html).not.toMatch(/unsubscribe/i);
  });

  it("renders the newsletter confirmation, saying nothing is subscribed until the link is used", () => {
    const url = "https://app.example.com/newsletter/confirm?token=c0nf";
    const email = renderEmail(
      { template: "newsletter-confirmation", variables: { confirmationUrl: url } },
      CONTEXT,
    );

    expect(email.subject).toBe("Confirm your newsletter subscription");
    expect(email.html).toContain(`href="${url}"`);
    expect(email.text).toContain(url);
    expect(email.text).toMatch(/not be subscribed/i);
  });

  it("HTML-escapes the ampersands of a link with several query parameters", () => {
    const url = "https://app.example.com/verify-email?token=a&x=1";
    const email = renderEmail(
      { template: "email-verification", variables: { verificationUrl: url } },
      CONTEXT,
    );

    expect(email.html).toContain('href="https://app.example.com/verify-email?token=a&amp;x=1"');
    expect(email.text).toContain(url);
  });
});

describe("renderEmail — link safety", () => {
  it.each([
    ["another origin", "https://evil.example.net/verify-email?token=x"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a relative URL", "/verify-email?token=x"],
    ["a look-alike host", "https://app.example.com.evil.net/verify-email"],
    ["a user-info spoof", "https://app.example.com@evil.net/verify-email"],
    ["another port", "https://app.example.com:8443/verify-email"],
    ["another scheme", "ftp://app.example.com/verify-email"],
    ["an attribute break-out", 'https://app.example.com/x"onmouseover="alert(1)'],
  ])("refuses %s", (_label, url) => {
    expect(() =>
      renderEmail({ template: "email-verification", variables: { verificationUrl: url } }, CONTEXT),
    ).toThrow(EmailTemplateError);
  });
});

describe("renderEmail — newsletter issue (marketing)", () => {
  const unsubscribeUrl = "https://app.example.com/newsletter/unsubscribe?token=u.sig";

  it("renders the title and paragraphs and always an unsubscribe link", () => {
    const email = renderEmail(
      {
        template: "newsletter-issue",
        variables: {
          subject: "September news",
          title: "New Polish A1 lessons",
          paragraphs: ["Three new lessons.", "A new pronunciation topic."],
          unsubscribeUrl,
        },
      },
      CONTEXT,
    );

    expect(email.subject).toBe("September news");
    expect(email.html).toContain("New Polish A1 lessons");
    expect(email.html).toContain("<p>Three new lessons.</p>");
    expect(email.html).toContain(`href="${unsubscribeUrl}"`);
    expect(email.text).toContain(`Unsubscribe: ${unsubscribeUrl}`);
    expect(email.text).toContain("A new pronunciation topic.");
  });

  it("escapes untrusted text so it can never become markup", () => {
    const email = renderEmail(
      {
        template: "newsletter-issue",
        variables: {
          subject: "News",
          title: `<img src=x onerror="alert(1)">`,
          paragraphs: [`<a href="https://evil.example.net">click</a>`],
          unsubscribeUrl,
        },
      },
      CONTEXT,
    );

    expect(email.html).not.toContain("<img");
    expect(email.html).not.toContain('<a href="https://evil.example.net"');
    expect(email.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it.each([
    ["an empty subject", { subject: "  " }],
    ["a subject with a line break (header injection)", { subject: "Hi\r\nBcc: x@example.com" }],
    ["a subject over 150 characters", { subject: "x".repeat(151) }],
    ["an empty title", { title: "" }],
    ["no paragraphs", { paragraphs: [] }],
    ["an empty paragraph", { paragraphs: ["ok", " "] }],
    ["too many paragraphs", { paragraphs: Array.from({ length: 21 }, () => "p") }],
    ["a paragraph over 2000 characters", { paragraphs: ["x".repeat(2001)] }],
    ["an unsubscribe link to another origin", { unsubscribeUrl: "https://evil.example.net/u" }],
  ])("refuses %s", (_label, override) => {
    expect(() =>
      renderEmail(
        {
          template: "newsletter-issue",
          variables: {
            subject: "News",
            title: "Title",
            paragraphs: ["Body"],
            unsubscribeUrl,
            ...override,
          },
        },
        CONTEXT,
      ),
    ).toThrow(EmailTemplateError);
  });
});

describe("renderEmail — layout", () => {
  it("produces a complete, language-tagged HTML document with the product name", () => {
    const email = renderEmail(
      { template: "password-reset", variables: { resetUrl: "https://app.example.com/r?t=1" } },
      CONTEXT,
    );

    expect(email.html.startsWith("<!doctype html>")).toBe(true);
    expect(email.html).toContain('<html lang="en">');
    expect(email.html).toContain("TFM-BIC");
  });
});

import { describe, expect, it } from "vitest";

import {
  categoryOfTemplate,
  EMAIL_TEMPLATE_IDS,
  isMarketingTemplate,
  isTransactionalTemplate,
  MARKETING_TEMPLATE_IDS,
  TRANSACTIONAL_TEMPLATE_IDS,
} from "./email-category.js";

describe("email categories", () => {
  it("classifies account and security emails as transactional", () => {
    expect(categoryOfTemplate("email-verification")).toBe("transactional");
    expect(categoryOfTemplate("password-reset")).toBe("transactional");
  });

  it("classifies the newsletter confirmation as transactional: it is sent before any consent exists", () => {
    expect(categoryOfTemplate("newsletter-confirmation")).toBe("transactional");
  });

  it("classifies the newsletter issue as marketing", () => {
    expect(categoryOfTemplate("newsletter-issue")).toBe("marketing");
  });

  it("never lists a template in both categories", () => {
    const overlap = TRANSACTIONAL_TEMPLATE_IDS.filter((id) =>
      (MARKETING_TEMPLATE_IDS as readonly string[]).includes(id),
    );
    expect(overlap).toEqual([]);
    expect(EMAIL_TEMPLATE_IDS).toHaveLength(
      TRANSACTIONAL_TEMPLATE_IDS.length + MARKETING_TEMPLATE_IDS.length,
    );
  });

  it("narrows unknown strings with the type guards", () => {
    expect(isTransactionalTemplate("password-reset")).toBe(true);
    expect(isTransactionalTemplate("newsletter-issue")).toBe(false);
    expect(isMarketingTemplate("newsletter-issue")).toBe(true);
    expect(isMarketingTemplate("password-reset")).toBe(false);
    expect(isMarketingTemplate("anything-else")).toBe(false);
  });
});

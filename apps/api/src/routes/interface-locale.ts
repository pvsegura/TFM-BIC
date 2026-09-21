import type { AchievementTexts } from "@tfm-bic/application";
import type { FastifyRequest } from "fastify";

const MAX_ENTRIES = 10;
const MAX_TAG_LENGTH = 35;
/** A BCP 47-shaped tag or `*`: letters, digits and hyphens only — nothing a header could smuggle in. */
const LANGUAGE_TAG = /^[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*$/;

/**
 * The languages an `Accept-Language` header asks for, best first. Weights are honoured
 * (`q=0` means "not acceptable"), equal weights keep their order, only a bounded number of
 * well-formed tags is read, and anything else is dropped — the header is untrusted input.
 */
export function parseAcceptLanguage(header: string | undefined): string[] {
  if (!header) {
    return [];
  }

  return header
    .split(",")
    .slice(0, MAX_ENTRIES)
    .map((entry, index) => {
      const [tag = "", ...params] = entry.split(";").map((part) => part.trim());
      const weightParam = params.find((param) => param.toLowerCase().startsWith("q="));
      const parsed = weightParam === undefined ? 1 : Number(weightParam.slice(2));
      return { tag, index, weight: Number.isFinite(parsed) ? parsed : 1 };
    })
    .filter(
      ({ tag, weight }) => tag.length <= MAX_TAG_LENGTH && LANGUAGE_TAG.test(tag) && weight > 0,
    )
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map(({ tag }) => tag);
}

/**
 * The language to write an achievement's title and description in for this request: the first
 * one the client asks for that texts exist in, otherwise the default. Language-neutral keys are
 * what is stored and sent; this only chooses the words.
 */
export function requestLocale(request: FastifyRequest, texts: AchievementTexts): string {
  return texts.pickLocale(parseAcceptLanguage(request.headers["accept-language"]));
}

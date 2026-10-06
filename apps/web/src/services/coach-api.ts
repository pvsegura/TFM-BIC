import {
  coachMessageResponseSchema,
  coachStatusResponseSchema,
  type CoachContextRef,
  type CoachMessageResponse,
  type CoachStatusResponse,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

/**
 * The AI Coach's client (M23, ADR-034). Same-origin and cookie-authenticated like every other
 * per-student service: the learner is identified by the session cookie alone, and this client has
 * no way to name one — there is no user id in the request type.
 *
 * The conversation lives here, in the browser, and is sent back with each turn (the server
 * normalises it and keeps only learner/coach text). Nothing is persisted: no `localStorage`, no
 * database, no provider-side state. That is the privacy decision of ADR-034, not an oversight, and
 * it is why the page says the conversation is not saved.
 */

export type CoachMode = CoachMessageResponse["mode"];

export interface CoachTurn {
  role: "learner" | "coach";
  text: string;
}

export interface CoachMessageRequest {
  message: string;
  mode: CoachMode;
  languageCode: string;
  history: readonly CoachTurn[];
  context?: CoachContextRef | undefined;
}

/** With a language, the response also carries the course context the coach will be given. */
export async function fetchCoachStatus(languageCode?: string): Promise<CoachStatusResponse> {
  const query = languageCode === undefined ? "" : `?language=${encodeURIComponent(languageCode)}`;
  return coachStatusResponseSchema.parse(await requestJson(`/ai-coach/status${query}`));
}

export async function sendCoachMessage(
  request: CoachMessageRequest,
): Promise<CoachMessageResponse> {
  // Mapped field by field — never spread from a form or a component's state, so a stray property
  // (a model name, a level, an id) cannot reach the API and be refused as a 400.
  const body: Record<string, unknown> = {
    message: request.message,
    mode: request.mode,
    language: request.languageCode,
    history: request.history.map((turn) => ({ role: turn.role, text: turn.text })),
  };
  if (request.context) {
    body.context = request.context;
  }
  return coachMessageResponseSchema.parse(
    await requestJson("/ai-coach/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

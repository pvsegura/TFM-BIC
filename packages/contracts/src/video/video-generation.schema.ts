import { VIDEO_GENERATION_STATUSES } from "@tfm-bic/domain";
import { z } from "zod";

import { videoDefinitionIdSchema } from "../content/identifiers.schema.js";

/**
 * Video generation shapes (M11). Response schemas are allowlists — a provider job reference, a
 * media reference or an error category is sent only when the job has reached the state that sets
 * it, never guessed at. Request schemas are strict: a `status`, a `userId` or any other
 * undocumented key is rejected, never silently ignored — the server is the only source of truth
 * for who requested a job and what happened to it.
 */

const isoTimestamp = z.iso.datetime();

/** `POST /video-generations` — the only thing a client controls is which definition to render. */
export const requestVideoGenerationRequestSchema = z.strictObject({
  videoDefinitionId: videoDefinitionIdSchema,
});
export type RequestVideoGenerationRequest = z.infer<typeof requestVideoGenerationRequestSchema>;

/** A generation job is addressed by its own id (a server-generated UUID), never a content id. */
export const videoGenerationJobIdParamSchema = z.object({ jobId: z.uuid() });

/**
 * A generation job as its owner sees it. `mediaReference` and `errorCategory` are `null` until the
 * job reaches `completed`/`failed` respectively — never a placeholder value in the meantime.
 */
export const videoGenerationJobResponseSchema = z.object({
  id: z.uuid(),
  videoDefinitionId: videoDefinitionIdSchema,
  status: z.enum(VIDEO_GENERATION_STATUSES),
  mediaReference: z.string().nullable(),
  errorCategory: z.string().nullable(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
  completedAt: isoTimestamp.nullable(),
});
export type VideoGenerationJobResponse = z.infer<typeof videoGenerationJobResponseSchema>;

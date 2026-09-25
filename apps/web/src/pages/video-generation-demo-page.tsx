import { Button } from "@tfm-bic/ui";
import { useState } from "react";

import { LoadError } from "../components/catalog-notices.js";
import {
  useRequestVideoGeneration,
  useVideoGenerationStatus,
} from "../hooks/use-video-generations.js";
import { ApiError } from "../services/api-error.js";

/**
 * M11's one vertical-slice video, hardcoded for this milestone: there is no browsing/listing
 * endpoint (see ADR-012 — the brief itself only calls for `POST`/`GET /video-generations`), so the
 * demo page requests generation of the one authored definition rather than letting a student pick
 * from a catalog. `content/languages/pl/videos/pl-a1-nasal-vowels-demo.json` is the source of
 * truth for this title/description; they are repeated here only for display, never re-derived
 * from business logic.
 */
const DEMO_VIDEO_DEFINITION_ID = "pl-a1-nasal-vowels-demo";
const DEMO_VIDEO_TITLE = "Nasal vowels: ą and ę";
const DEMO_VIDEO_DESCRIPTION =
  "A short demo video introducing two nasal vowels, ą and ę, and one example word for each.";

/** A safe error category, from a fixed list, becomes one sentence a student can act on — never the
 * raw provider message (see `RequestVideoGenerationUseCase`, which is all the client ever gets). */
function describeFailure(errorCategory: string | null): string {
  switch (errorCategory) {
    case "timeout":
      return "The video took too long to generate.";
    case "provider_unavailable":
      return "The video generation service is unavailable right now.";
    case "provider_rejected":
      return "The video generation service could not process this request.";
    default:
      return "Something went wrong while generating this video.";
  }
}

export function VideoGenerationDemoPage() {
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const requestGeneration = useRequestVideoGeneration();
  const statusQuery = useVideoGenerationStatus(jobId);

  const handleGenerate = () => {
    requestGeneration.mutate(DEMO_VIDEO_DEFINITION_ID, {
      onSuccess: (job) => setJobId(job.id),
    });
  };

  const status = statusQuery.data?.status;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-semibold">Video generation</h1>
      <p className="mt-1 text-primary/70 dark:text-surface/70">
        A foundation for generating educational videos (M11). This demo requests generation of one
        video and shows its status as the server renders it.
      </p>

      <div className="mt-6 rounded-lg border border-primary/20 px-4 py-4 dark:border-surface/20">
        <h2 className="text-lg font-semibold">{DEMO_VIDEO_TITLE}</h2>
        <p className="mt-1 text-sm text-primary/70 dark:text-surface/70">
          {DEMO_VIDEO_DESCRIPTION}
        </p>

        <div className="mt-4">
          <Button
            onClick={handleGenerate}
            disabled={requestGeneration.isPending || status === "queued" || status === "processing"}
          >
            {jobId === undefined ? "Generate video" : "Generate again"}
          </Button>
        </div>

        {requestGeneration.isPending ? (
          <p role="status" className="mt-4 text-sm">
            Starting generation…
          </p>
        ) : null}

        {requestGeneration.isError ? (
          <LoadError
            message={
              requestGeneration.error instanceof ApiError
                ? requestGeneration.error.message
                : "We couldn't start generating this video. Please try again."
            }
            onRetry={handleGenerate}
          />
        ) : null}

        {jobId !== undefined && (status === "queued" || status === "processing") ? (
          <p role="status" className="mt-4 text-sm">
            Generating your video… this can take a little while.
          </p>
        ) : null}

        {status === "completed" ? (
          <div className="mt-4">
            <p role="status" className="text-sm font-medium text-green-700 dark:text-green-400">
              Your video is ready.
            </p>
            {/* No accessible, playable URL exists yet: media storage is PENDING (see ADR-012 —
                the fake provider's reference and a real Hyperframes render's local file path are
                both opaque, not a servable URL). A future milestone that resolves media storage
                can replace this note with an actual <video controls> element pointed at
                statusQuery.data.mediaReference, once that is a real URL. */}
            <p className="mt-1 text-sm text-primary/70 dark:text-surface/70">
              Preview is not available yet — media storage for generated videos is still pending
              (see ADR-012).
            </p>
          </div>
        ) : null}

        {status === "failed" ? (
          <LoadError
            message={describeFailure(statusQuery.data?.errorCategory ?? null)}
            onRetry={handleGenerate}
          />
        ) : null}

        {statusQuery.isError ? (
          <LoadError
            message="We couldn't check this video's status. Please try again."
            onRetry={() => void statusQuery.refetch()}
          />
        ) : null}
      </div>
    </div>
  );
}

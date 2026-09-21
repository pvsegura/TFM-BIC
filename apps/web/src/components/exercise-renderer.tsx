import type { ExerciseResponse } from "@tfm-bic/contracts";

import { viewFor } from "./exercise-view-registry.js";
import type { ExerciseViewProps } from "./exercise-view-types.js";

/**
 * Shows one exercise through the view registered for its type (see
 * `exercise-view-registry.ts`). Generic: one renderer for every language, level
 * and exercise type. A type the registry does not hold — one a newer API could
 * send — shows a neutral notice and none of the exercise's data.
 */
export function ExerciseRenderer(props: ExerciseViewProps<ExerciseResponse>) {
  const view = viewFor(props.exercise.type);
  if (!view) {
    return <p>This kind of exercise is not available yet.</p>;
  }
  return view.render(props);
}

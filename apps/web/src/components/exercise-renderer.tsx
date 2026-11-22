import type { ExerciseResponse } from "@verbysia/contracts";

import { viewFor } from "./exercise-view-registry.js";
import type { ExerciseViewProps } from "./exercise-view-types.js";
import { m } from "../i18n/index.js";

/**
 * Shows one exercise through the view registered for its type (see
 * `exercise-view-registry.ts`). Generic: one renderer for every language, level
 * and exercise type. A type the registry does not hold — one a newer API could
 * send — shows a neutral notice and none of the exercise's data.
 */
export function ExerciseRenderer(props: ExerciseViewProps<ExerciseResponse>) {
  const view = viewFor(props.exercise.type);
  if (!view) {
    return <p>{m.learn.exercises.unsupported}</p>;
  }
  return view.render(props);
}

import { account } from "./account.js";
import { admin } from "./admin.js";
import { auth } from "./auth.js";
import { common } from "./common.js";
import { errors } from "./errors.js";
import { layout } from "./layout.js";
import { learn } from "./learn.js";
import { marketing } from "./marketing.js";
import { memory } from "./memory.js";
import { vocabulary } from "./vocabulary.js";

/** Literal string types widened to `string`, so other languages can fill the same shape. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Widen<T[K]> }
        : T;

const catalog = {
  common,
  layout,
  errors,
  marketing,
  memory,
  admin,
  auth,
  learn,
  account,
  vocabulary,
};

/** The shape every interface language must match (the compiler lists any missing text). */
export type Messages = Widen<typeof catalog>;

/** The Polish interface catalog — the reference language. */
export const pl: Messages = catalog;

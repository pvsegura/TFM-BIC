import {
  LinkStudentToTeacherUseCase,
  PromoteUserToTeacherUseCase,
  UnlinkStudentFromTeacherUseCase,
} from "@tfm-bic/application";

import { SystemClock } from "../clock/system-clock.js";
import { createIdentityDb } from "../identity/db/client.js";
import { DrizzleUserRepository } from "../identity/user.repository.js";
import { createTeachingDb } from "./db/client.js";
import { runTeacherAdminCommand } from "./teacher-admin-command.js";
import { DrizzleTeacherStudentLinkRepository } from "./teacher-student-link.repository.js";

/**
 * `pnpm --filter @tfm-bic/data teacher:admin <promote|link|unlink> …` against `DATABASE_URL`.
 * Bootstrap only (argv in, exit code out): the logic is `runTeacherAdminCommand`, which is
 * unit-tested, so this file is excluded from coverage like the other entry points.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("DATABASE_URL is required.\n");
  process.exit(2);
}

const identity = createIdentityDb(databaseUrl);
const teaching = createTeachingDb(databaseUrl);
const users = new DrizzleUserRepository(identity.db);
const links = new DrizzleTeacherStudentLinkRepository(teaching.db);
const clock = new SystemClock();

try {
  const result = await runTeacherAdminCommand(process.argv.slice(2), {
    promote: new PromoteUserToTeacherUseCase(users, links),
    link: new LinkStudentToTeacherUseCase(users, links, clock),
    unlink: new UnlinkStudentFromTeacherUseCase(users, links),
  });
  (result.exitCode === 0 ? process.stdout : process.stderr).write(`${result.message}\n`);
  process.exitCode = result.exitCode;
} finally {
  await Promise.all([identity.close(), teaching.close()]);
}

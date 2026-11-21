import { canAccess, hasPremium, type ContentAccess, type LicenceRecord } from "@verbysia/domain";

import type { Clock } from "../ports/clock.js";
import type { LicenceRepository } from "./ports.js";

/**
 * The single server-side gate for paid content: every use case that hands out premium material
 * asks this, with the user id taken from the session. Licences are read fresh per request, so a
 * refund or an expired subscription stops access immediately.
 */
export class AccessPolicy {
  constructor(
    private readonly licences: LicenceRepository,
    private readonly clock: Clock,
  ) {}

  async canOpen(userId: string, access: ContentAccess): Promise<boolean> {
    if (access.tier !== "course") return true;
    return canAccess(await this.licences.listByUser(userId), access, this.clock.now());
  }

  /** One read for many checks (e.g. filtering a list of vocabulary entries). */
  async forUser(userId: string): Promise<UserAccess> {
    return new UserAccess(await this.licences.listByUser(userId), this.clock.now());
  }
}

export class UserAccess {
  constructor(
    readonly licences: readonly LicenceRecord[],
    private readonly now: Date,
  ) {}

  canOpen(access: ContentAccess): boolean {
    return canAccess(this.licences, access, this.now);
  }

  get premium(): boolean {
    return hasPremium(this.licences, this.now);
  }
}

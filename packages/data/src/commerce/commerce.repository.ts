import type {
  AdminAuditLog,
  AdminUserDirectory,
  AdminUserSummary,
  LicenceRepository,
  ProductRepository,
  PurchaseRepository,
  SubscriptionRepository,
} from "@verbysia/application";
import { and, asc, count, desc, eq, ilike, isNull } from "drizzle-orm";

import { users } from "../identity/db/schema.js";
import type { CommerceDb } from "./db/client.js";
import { adminAuditLog, licences, products, purchases, subscriptions } from "./db/schema.js";

export interface CommerceRepositories {
  products: ProductRepository;
  licences: LicenceRepository;
  purchases: PurchaseRepository;
  subscriptions: SubscriptionRepository;
  audit: AdminAuditLog;
  users: AdminUserDirectory;
}

/** `%`, `_` and `\` are LIKE metacharacters: escaped so a search term only ever matches literally. */
function likeLiteral(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const userColumns = {
  id: users.id,
  email: users.email,
  role: users.role,
  emailVerified: users.emailVerified,
  createdAt: users.createdAt,
};

/**
 * Commerce in Postgres, one small object per application port over a single database handle.
 * Every timestamp comes from the caller's clock. Licences are never deleted: revoking sets
 * `revoked_at` once (a second revocation keeps the first time).
 */
export function createCommerceRepositories(db: CommerceDb): CommerceRepositories {
  return {
    products: {
      list: async () => db.select().from(products).orderBy(asc(products.sortOrder)),
      findById: async (id) => {
        const [row] = await db.select().from(products).where(eq(products.id, id));
        return row ?? null;
      },
      update: async (id, changes, now) => {
        const [row] = await db
          .update(products)
          .set({ ...changes, updatedAt: now })
          .where(eq(products.id, id))
          .returning();
        return row ?? null;
      },
    },
    licences: {
      listByUser: async (userId) =>
        db
          .select()
          .from(licences)
          .where(eq(licences.userId, userId))
          .orderBy(desc(licences.createdAt)),
      findById: async (id) => {
        const [row] = await db.select().from(licences).where(eq(licences.id, id));
        return row ?? null;
      },
      grant: async (input) => {
        const [row] = await db.insert(licences).values(input).returning();
        if (!row) throw new Error("Licence insert returned no row.");
        return row;
      },
      revoke: async (id, at) => {
        await db
          .update(licences)
          .set({ revokedAt: at })
          .where(and(eq(licences.id, id), isNull(licences.revokedAt)));
        const [row] = await db.select().from(licences).where(eq(licences.id, id));
        return row ?? null;
      },
    },
    purchases: {
      listByUser: async (userId) =>
        db
          .select()
          .from(purchases)
          .where(eq(purchases.userId, userId))
          .orderBy(desc(purchases.createdAt)),
      listRecent: async (limit) =>
        db.select().from(purchases).orderBy(desc(purchases.createdAt)).limit(limit),
    },
    subscriptions: {
      listByUser: async (userId) =>
        db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .orderBy(desc(subscriptions.createdAt)),
      listRecent: async (limit) =>
        db.select().from(subscriptions).orderBy(desc(subscriptions.updatedAt)).limit(limit),
    },
    audit: {
      record: async (entry) => {
        await db.insert(adminAuditLog).values(entry);
      },
      listRecent: async (limit) =>
        db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(limit),
    },
    users: {
      search: async (query, limit, offset) => {
        const where = query === "" ? undefined : ilike(users.email, likeLiteral(query));
        const [rows, totals] = await Promise.all([
          db
            .select(userColumns)
            .from(users)
            .where(where)
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset),
          db.select({ total: count() }).from(users).where(where),
        ]);
        return { users: rows satisfies AdminUserSummary[], total: totals[0]?.total ?? 0 };
      },
      findById: async (id) => {
        const [row] = await db.select(userColumns).from(users).where(eq(users.id, id));
        return row ?? null;
      },
    },
  };
}

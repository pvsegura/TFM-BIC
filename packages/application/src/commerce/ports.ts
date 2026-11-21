import type {
  AdminAuditEntry,
  LicenceKind,
  LicenceRecord,
  LicenceSource,
  Product,
  ProductStatus,
  Purchase,
  Role,
  Subscription,
} from "@verbysia/domain";

export interface GrantLicenceInput {
  userId: string;
  kind: LicenceKind;
  startsAt: Date;
  endsAt: Date | null;
  source: LicenceSource;
  sourceId: string | null;
  note: string | null;
  createdAt: Date;
}

export interface LicenceRepository {
  listByUser(userId: string): Promise<readonly LicenceRecord[]>;
  findById(licenceId: string): Promise<LicenceRecord | null>;
  grant(input: GrantLicenceInput): Promise<LicenceRecord>;
  /** Sets `revoked_at` once; a licence already revoked keeps its first revocation time. */
  revoke(licenceId: string, at: Date): Promise<LicenceRecord | null>;
}

export interface ProductChanges {
  status?: ProductStatus | undefined;
  namePl?: string | undefined;
  descriptionPl?: string | undefined;
  priceMinor?: number | undefined;
  accessDays?: number | null | undefined;
  providerPriceId?: string | null | undefined;
}

export interface ProductRepository {
  list(): Promise<readonly Product[]>;
  findById(productId: string): Promise<Product | null>;
  update(productId: string, changes: ProductChanges, now: Date): Promise<Product | null>;
}

export interface PurchaseRepository {
  listByUser(userId: string): Promise<readonly Purchase[]>;
  listRecent(limit: number): Promise<readonly Purchase[]>;
}

export interface SubscriptionRepository {
  listByUser(userId: string): Promise<readonly Subscription[]>;
  listRecent(limit: number): Promise<readonly Subscription[]>;
}

export interface AdminAuditLog {
  record(entry: Omit<AdminAuditEntry, "id">): Promise<void>;
  listRecent(limit: number): Promise<readonly AdminAuditEntry[]>;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: Date;
}

export interface AdminUserDirectory {
  /** Case-insensitive email substring search, newest first. */
  search(
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ users: readonly AdminUserSummary[]; total: number }>;
  findById(userId: string): Promise<AdminUserSummary | null>;
}

import type { AdminProduct, AdminUserDetailResponse } from "@verbysia/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { formatDate, formatDateTime, formatPrice, m } from "../i18n/index.js";
import { errorMessage } from "../services/api-error.js";
import {
  fetchAdminAudit,
  fetchAdminProducts,
  fetchAdminPurchases,
  fetchAdminSubscriptions,
  fetchAdminUser,
  fetchAdminUsers,
  grantLicence,
  revokeLicence,
  updateProduct,
} from "../services/admin-api.js";
import { syncProductsWithProvider } from "../services/commerce-api.js";

const t = m.admin;
type Tab = keyof typeof t.tabs;
const LICENCE_KINDS = Object.keys(t.licenceKinds) as (keyof typeof t.licenceKinds)[];

const cell = "border-b border-primary/10 px-2 py-2 text-left align-top dark:border-surface/10";

/** The admin panel (ADMIN only; the API authorises and audits every request). */
export function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  return (
    <section aria-labelledby="admin-heading" className="py-8">
      <h1 id="admin-heading" className="font-display text-3xl font-bold">
        {t.title}
      </h1>
      <PaymentsBanner />
      <div role="tablist" aria-label={t.title} className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(t.tabs) as Tab[]).map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              tab === key
                ? "bg-primary text-surface dark:bg-surface dark:text-primary"
                : "border border-primary/20 dark:border-surface/20"
            }`}
          >
            {t.tabs[key]}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6 overflow-x-auto">
        {tab === "users" ? <UsersTab /> : null}
        {tab === "products" ? <ProductsTab /> : null}
        {tab === "purchases" ? <PurchasesTab /> : null}
        {tab === "subscriptions" ? <SubscriptionsTab /> : null}
        {tab === "audit" ? <AuditTab /> : null}
      </div>
    </section>
  );
}

function UsersTab() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const users = useQuery({
    queryKey: ["admin", "users", submitted],
    queryFn: () => fetchAdminUsers(submitted),
  });

  function search(event: FormEvent) {
    event.preventDefault();
    setSubmitted(query.trim());
    setSelected(null);
  }

  return (
    <div>
      <form onSubmit={search} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm">
          {t.searchLabel}
          <input
            type="search"
            value={query}
            placeholder={t.searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-1 rounded-lg border border-primary/30 bg-transparent px-3 py-2 dark:border-surface/30"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 font-bold text-surface dark:bg-surface dark:text-primary"
        >
          {m.common.search}
        </button>
      </form>
      {users.isError ? <p role="alert">{errorMessage(users.error)}</p> : null}
      {users.data ? (
        <>
          <p className="mt-3 text-sm">{t.usersTotal(users.data.total)}</p>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr>
                <th className={cell}>{t.columns.email}</th>
                <th className={cell}>{t.columns.role}</th>
                <th className={cell}>{t.columns.verified}</th>
                <th className={cell}>{t.columns.created}</th>
                <th className={cell} />
              </tr>
            </thead>
            <tbody>
              {users.data.users.map((user) => (
                <tr key={user.id}>
                  <td className={cell}>{user.email}</td>
                  <td className={cell}>{t.roles[user.role]}</td>
                  <td className={cell}>{user.emailVerified ? m.common.yes : m.common.no}</td>
                  <td className={cell}>{formatDate(user.createdAt)}</td>
                  <td className={cell}>
                    <button
                      type="button"
                      className="font-bold underline"
                      onClick={() => setSelected(user.id)}
                    >
                      {t.details}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      {selected ? <UserDetail userId={selected} /> : null}
    </div>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => fetchAdminUser(userId),
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  };
  const revoke = useMutation({ mutationFn: revokeLicence, onSuccess: refresh });

  if (detail.isError) return <p role="alert">{errorMessage(detail.error)}</p>;
  if (!detail.data) return <p>{m.common.loading}</p>;
  const { user, licences } = detail.data;

  return (
    <div className="mt-6 rounded-2xl border border-primary/10 p-4 dark:border-surface/10">
      <h2 className="font-display text-xl font-bold">
        {t.userTitle}: {user.email}
      </h2>
      <h3 className="mt-4 font-bold">{t.licencesTitle}</h3>
      {licences.length === 0 ? (
        <p className="text-sm">{t.noLicences}</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr>
              <th className={cell}>{t.columns.kind}</th>
              <th className={cell}>{t.columns.status}</th>
              <th className={cell}>{t.columns.from}</th>
              <th className={cell}>{t.columns.until}</th>
              <th className={cell}>{t.columns.source}</th>
              <th className={cell}>{t.columns.note}</th>
              <th className={cell} />
            </tr>
          </thead>
          <tbody>
            {licences.map((licence) => (
              <tr key={licence.id}>
                <td className={cell}>{t.licenceKinds[licence.kind]}</td>
                <td className={cell}>{licence.active ? t.active : t.inactive}</td>
                <td className={cell}>{formatDate(licence.startsAt)}</td>
                <td className={cell}>
                  {licence.endsAt ? formatDate(licence.endsAt) : t.indefinite}
                </td>
                <td className={cell}>{t.sources[licence.source]}</td>
                <td className={cell}>{licence.note ?? ""}</td>
                <td className={cell}>
                  {licence.revokedAt === null ? (
                    <button
                      type="button"
                      className="font-bold text-danger underline"
                      disabled={revoke.isPending}
                      onClick={() => {
                        if (window.confirm(t.revokeConfirm)) revoke.mutate(licence.id);
                      }}
                    >
                      {t.revoke}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <GrantForm userId={userId} onGranted={refresh} />
      <CommerceHistory detail={detail.data} />
    </div>
  );
}

function GrantForm({ userId, onGranted }: { userId: string; onGranted: () => void }) {
  const [kind, setKind] = useState<(typeof LICENCE_KINDS)[number]>("COURSE_A1");
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");
  const grant = useMutation({
    mutationFn: () =>
      grantLicence(userId, {
        kind,
        days: days.trim() === "" ? null : Number(days),
        note: note.trim() === "" ? null : note.trim(),
      }),
    onSuccess: () => {
      setDays("");
      setNote("");
      onGranted();
    },
  });

  return (
    <form
      className="mt-6 grid gap-3 sm:grid-cols-4 sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        grant.mutate();
      }}
    >
      <h3 className="font-bold sm:col-span-4">{t.grantTitle}</h3>
      <label className="flex flex-col text-sm">
        {t.grantKind}
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="mt-1 rounded-lg border border-primary/30 bg-transparent px-2 py-2 dark:border-surface/30"
        >
          {LICENCE_KINDS.map((value) => (
            <option key={value} value={value}>
              {t.licenceKinds[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-sm">
        {t.grantDays}
        <input
          type="number"
          min={1}
          max={3660}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="mt-1 rounded-lg border border-primary/30 bg-transparent px-2 py-2 dark:border-surface/30"
        />
      </label>
      <label className="flex flex-col text-sm">
        {t.grantNote}
        <input
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 rounded-lg border border-primary/30 bg-transparent px-2 py-2 dark:border-surface/30"
        />
      </label>
      <button
        type="submit"
        disabled={grant.isPending}
        className="rounded-lg bg-accent px-4 py-2 font-bold text-primary disabled:opacity-50"
      >
        {t.grant}
      </button>
      {grant.isError ? (
        <p role="alert" className="sm:col-span-4">
          {errorMessage(grant.error)}
        </p>
      ) : null}
    </form>
  );
}

function CommerceHistory({ detail }: { detail: AdminUserDetailResponse }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 text-sm">
      <div>
        <h3 className="font-bold">{t.tabs.purchases}</h3>
        {detail.purchases.length === 0 ? <p>{t.noPurchases}</p> : null}
        <ul>
          {detail.purchases.map((p) => (
            <li key={p.id}>
              {formatDateTime(p.createdAt)} · {p.productId} ·{" "}
              {formatPrice(p.amountMinor, p.currency)} · {t.purchaseStatuses[p.status]}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-bold">{t.tabs.subscriptions}</h3>
        {detail.subscriptions.length === 0 ? <p>{t.noSubscriptions}</p> : null}
        <ul>
          {detail.subscriptions.map((s) => (
            <li key={s.id}>
              {s.productId} · {t.subscriptionStatuses[s.status]} · {formatDate(s.currentPeriodEnd)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Whether the server has a payment provider configured (Stripe keys present). */
function PaymentsBanner() {
  const products = useQuery({ queryKey: ["admin", "products"], queryFn: fetchAdminProducts });
  if (!products.data) return null;
  return (
    <p className="mt-2 max-w-3xl rounded-xl bg-accent/15 px-4 py-3 text-sm">
      {products.data.paymentsEnabled ? t.paymentsReady : t.paymentsPending}
    </p>
  );
}

function ProductsTab() {
  const queryClient = useQueryClient();
  const products = useQuery({ queryKey: ["admin", "products"], queryFn: fetchAdminProducts });
  const sync = useMutation({
    mutationFn: syncProductsWithProvider,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
  if (products.isError) return <p role="alert">{errorMessage(products.error)}</p>;
  if (!products.data) return <p>{m.common.loading}</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={sync.isPending}
          onClick={() => sync.mutate()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-surface dark:bg-surface dark:text-primary"
        >
          {m.marketing.payments.syncCta}
        </button>
        {sync.isSuccess ? (
          <p role="status" className="text-sm">
            {m.marketing.payments.syncDone(sync.data.length)}
          </p>
        ) : null}
        {sync.isError ? (
          <p role="alert" className="text-sm">
            {errorMessage(sync.error)}
          </p>
        ) : null}
      </div>
      {products.data.products.map((product) => (
        <ProductEditor
          key={`${product.id}:${product.updatedAt}:${product.providerPriceId ?? ""}`}
          product={product}
        />
      ))}
      <p className="text-sm text-primary/70 dark:text-surface/70">{t.couponsNote}</p>
    </div>
  );
}

function ProductEditor({ product }: { product: AdminProduct }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(product.status);
  const [price, setPrice] = useState(String(product.priceMinor));
  const [providerPriceId, setProviderPriceId] = useState(product.providerPriceId ?? "");
  const save = useMutation({
    mutationFn: () =>
      updateProduct(product.id, {
        status,
        priceMinor: Number(price),
        providerPriceId: providerPriceId.trim() === "" ? null : providerPriceId.trim(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  return (
    <form
      className="grid gap-3 rounded-2xl border border-primary/10 p-4 sm:grid-cols-5 sm:items-end dark:border-surface/10"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="sm:col-span-5">
        <p className="font-display font-bold">{product.namePl}</p>
        <p className="text-sm text-primary/70 dark:text-surface/70">
          {product.id} · {t.licenceKinds[product.licenceKind]} · {t.billing[product.billing]} ·{" "}
          {formatPrice(product.priceMinor, product.currency)}
        </p>
      </div>
      <label className="flex flex-col text-sm">
        {t.columns.status}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="mt-1 rounded-lg border border-primary/30 bg-transparent px-2 py-2 dark:border-surface/30"
        >
          {(Object.keys(t.productStatuses) as (keyof typeof t.productStatuses)[]).map((value) => (
            <option key={value} value={value}>
              {t.productStatuses[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-sm">
        {t.editPrice}
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 rounded-lg border border-primary/30 bg-transparent px-2 py-2 dark:border-surface/30"
        />
      </label>
      <label className="flex flex-col text-sm sm:col-span-2">
        {t.providerPrice}
        <input
          value={providerPriceId}
          onChange={(e) => setProviderPriceId(e.target.value)}
          className="mt-1 rounded-lg border border-primary/30 bg-transparent px-2 py-2 dark:border-surface/30"
        />
      </label>
      <button
        type="submit"
        disabled={save.isPending}
        className="rounded-lg bg-accent px-4 py-2 font-bold text-primary"
      >
        {t.saveProduct}
      </button>
      {save.isSuccess ? (
        <p role="status" className="text-sm sm:col-span-5">
          {t.saved}
        </p>
      ) : null}
      {save.isError ? (
        <p role="alert" className="text-sm sm:col-span-5">
          {errorMessage(save.error)}
        </p>
      ) : null}
    </form>
  );
}

function PurchasesTab() {
  const purchases = useQuery({ queryKey: ["admin", "purchases"], queryFn: fetchAdminPurchases });
  if (purchases.isError) return <p role="alert">{errorMessage(purchases.error)}</p>;
  if (!purchases.data) return <p>{m.common.loading}</p>;
  if (purchases.data.length === 0) return <p>{t.noPurchases}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={cell}>{t.columns.date}</th>
          <th className={cell}>{t.columns.product}</th>
          <th className={cell}>{t.columns.amount}</th>
          <th className={cell}>{t.columns.status}</th>
          <th className={cell}>{t.columns.provider}</th>
        </tr>
      </thead>
      <tbody>
        {purchases.data.map((p) => (
          <tr key={p.id}>
            <td className={cell}>{formatDateTime(p.createdAt)}</td>
            <td className={cell}>{p.productId}</td>
            <td className={cell}>{formatPrice(p.amountMinor, p.currency)}</td>
            <td className={cell}>{t.purchaseStatuses[p.status]}</td>
            <td className={cell}>{p.provider}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SubscriptionsTab() {
  const subs = useQuery({ queryKey: ["admin", "subscriptions"], queryFn: fetchAdminSubscriptions });
  if (subs.isError) return <p role="alert">{errorMessage(subs.error)}</p>;
  if (!subs.data) return <p>{m.common.loading}</p>;
  if (subs.data.length === 0) return <p>{t.noSubscriptions}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={cell}>{t.columns.product}</th>
          <th className={cell}>{t.columns.status}</th>
          <th className={cell}>{t.columns.periodEnd}</th>
          <th className={cell}>{t.columns.provider}</th>
        </tr>
      </thead>
      <tbody>
        {subs.data.map((s) => (
          <tr key={s.id}>
            <td className={cell}>{s.productId}</td>
            <td className={cell}>{t.subscriptionStatuses[s.status]}</td>
            <td className={cell}>{formatDate(s.currentPeriodEnd)}</td>
            <td className={cell}>{s.provider}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AuditTab() {
  const audit = useQuery({ queryKey: ["admin", "audit"], queryFn: fetchAdminAudit });
  if (audit.isError) return <p role="alert">{errorMessage(audit.error)}</p>;
  if (!audit.data) return <p>{m.common.loading}</p>;
  if (audit.data.length === 0) return <p>{t.noEntries}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={cell}>{t.columns.date}</th>
          <th className={cell}>{t.columns.action}</th>
          <th className={cell}>{t.columns.target}</th>
          <th className={cell}>{t.columns.actor}</th>
        </tr>
      </thead>
      <tbody>
        {audit.data.map((entry) => (
          <tr key={entry.id}>
            <td className={cell}>{formatDateTime(entry.createdAt)}</td>
            <td className={cell}>{entry.action}</td>
            <td className={cell}>
              {entry.targetType}: {entry.targetId}
            </td>
            <td className={cell}>{entry.actorUserId}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

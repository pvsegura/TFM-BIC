import type { MyAccessResponse } from "@verbysia/contracts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Link } from "../components/app-link.js";
import { m } from "../i18n/index.js";
import { fetchMyAccess } from "../services/commerce-api.js";

const t = m.marketing.payments;
const POLL_MS = 2_000;
const GIVE_UP_MS = 45_000;
/** A licence that started this recently belongs to this purchase. */
const RECENT_MS = 15 * 60_000;

function hasRecentLicence(data: MyAccessResponse | undefined, since: number): boolean {
  return (data?.licences ?? []).some(
    (l) => l.active && new Date(l.startsAt).getTime() >= since - RECENT_MS,
  );
}

/**
 * Where Stripe sends the buyer back. It grants nothing: it only watches the learner's own access
 * (GET /me/access) until the server — having received Stripe's signed webhook — shows a fresh
 * active licence, or tells them it is still processing.
 */
export function PurchaseSuccessPage() {
  const [startedAt] = useState(() => Date.now());
  const [slow, setSlow] = useState(false);
  const access = useQuery<MyAccessResponse>({
    queryKey: ["me", "access", "after-purchase"],
    queryFn: fetchMyAccess,
    refetchInterval: (query) =>
      slow || hasRecentLicence(query.state.data, startedAt) ? false : POLL_MS,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const done = hasRecentLicence(access.data, startedAt);
  return (
    <section aria-labelledby="purchase-success" className="mx-auto max-w-2xl py-12">
      <h1 id="purchase-success" className="font-display text-3xl font-bold">
        {t.successTitle}
      </h1>
      <p role="status" className="mt-4 text-lg">
        {done ? t.successReady : slow ? t.successSlow : t.successChecking}
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 font-display font-bold text-primary"
      >
        {t.successCta}
      </Link>
    </section>
  );
}

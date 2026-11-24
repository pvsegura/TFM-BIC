import type { PublicProduct } from "@verbysia/contracts";
import { useQuery } from "@tanstack/react-query";

import { BuyButton } from "../../components/buy-button.js";
import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { formatPrice, m } from "../../i18n/index.js";
import { errorMessage } from "../../services/api-error.js";
import { fetchProducts } from "../../services/commerce-api.js";
import { Card, CheckList, PageHero, PrimaryLink } from "./public-parts.js";

const t = m.marketing.pricing;

function priceSuffix(product: PublicProduct): string {
  if (product.billing === "monthly") return t.perMonth;
  if (product.billing === "yearly") return t.perYear;
  return t.oneOff;
}

function yearlySaving(products: readonly PublicProduct[]): string | null {
  const monthly = products.find((p) => p.billing === "monthly" && p.status === "active");
  const yearly = products.find((p) => p.billing === "yearly" && p.status === "active");
  if (!monthly || !yearly) return null;
  const saving = monthly.priceMinor * 12 - yearly.priceMinor;
  return saving > 0 ? formatPrice(saving, yearly.currency) : null;
}

/**
 * Prices come from the server's product list (an administrator changes them, nothing is
 * hard-coded here). A product is only buyable once the server says so — until a payment
 * provider is configured, every button reads "payments soon" and is disabled.
 */
export function PricingPage() {
  useDocumentMeta(t.metaTitle, t.metaDescription);
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const list = products.data ?? [];
  const saving = yearlySaving(list);

  return (
    <div className="pb-10">
      <PageHero title={t.title} lead={t.lead} />
      <p className="mb-6 max-w-3xl rounded-xl bg-accent/15 px-4 py-3" role="note">
        {t.paymentsNotice}
      </p>

      {products.isError ? (
        <p role="alert">{errorMessage(products.error)}</p>
      ) : products.isPending ? (
        <p>{m.common.loading}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col">
          <h2 className="font-display text-xl font-bold">{t.freeName}</h2>
          <p className="mt-2 font-display text-3xl font-bold">{t.freePrice}</p>
          <div className="mt-4 grow">
            <CheckList items={t.freeFeatures} />
          </div>
          <div className="mt-5">
            <PrimaryLink to="/register">{t.freeCta}</PrimaryLink>
          </div>
        </Card>

        {list.map((product) => {
          const comingSoon = product.status === "coming_soon";
          const highlighted = product.billing === "yearly";
          return (
            <Card
              key={product.id}
              className={`flex flex-col ${highlighted ? "ring-2 ring-accent" : ""} ${comingSoon ? "opacity-70" : ""}`}
            >
              <h2 className="font-display text-xl font-bold">{product.name}</h2>
              <p className="mt-2">
                <span className="font-display text-3xl font-bold">
                  {formatPrice(product.priceMinor, product.currency)}
                </span>{" "}
                <span className="text-primary/70 dark:text-surface/70">{priceSuffix(product)}</span>
              </p>
              <p className="mt-2 text-primary/80 dark:text-surface/80">{product.description}</p>
              {product.billing === "one_off" && product.accessDays === null ? (
                <p className="mt-1 text-sm">{t.indefinite}</p>
              ) : null}
              {product.billing === "monthly" ? (
                <p className="mt-2 text-sm">{t.renewsMonthly}</p>
              ) : null}
              {product.billing === "yearly" ? (
                <>
                  <p className="mt-2 text-sm">{t.renewsYearly}</p>
                  {saving ? (
                    <p className="mt-1 text-sm font-bold">{t.yearlySaving(saving)}</p>
                  ) : null}
                </>
              ) : null}
              {product.billing !== "one_off" ? (
                <div className="mt-3 grow">
                  <CheckList items={t.premiumFeatures} />
                </div>
              ) : (
                <div className="grow" />
              )}
              <BuyButton
                productId={product.id}
                disabled={!product.purchasable}
                label={comingSoon ? t.comingSoon : product.purchasable ? t.buy : t.buySoon}
                className="mt-5 rounded-full bg-primary px-5 py-3 font-display font-bold text-surface disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface dark:text-primary"
              />
              {comingSoon ? <p className="mt-2 text-sm">{t.comingSoonBody}</p> : null}
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-primary/70 dark:text-surface/70">{t.vatNote}</p>
      <p className="mt-1 text-sm text-primary/70 dark:text-surface/70">{t.legalNote}</p>
    </div>
  );
}

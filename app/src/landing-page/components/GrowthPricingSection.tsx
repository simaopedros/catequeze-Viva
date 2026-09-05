import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  trackLead,
  trackViewPricing,
} from "../../client/analytics/metaTracking";
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";
import { formatPrice } from "../../shared/currency";
import { getSalesWhatsAppUrl } from "../../shared/salesContact";
import { useTranslation } from "react-i18next";
import { useLandingText, landingCopy } from "../hooks/useLandingText";
import { useScrollReveal } from "../hooks/useScrollReveal";

type LadderItem = { label: string; step: string };
type StoryItem = { title: string; desc: string };

/**
 * Catequista → Paróquia → Diocese as a growth ladder, not three competing products.
 */
export function GrowthPricingSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const { t } = useTranslation("public");
  const { localize, getBySlug } = usePlanCatalog();
  const {
    ref: headerRef,
    className: headerClass,
    isVisible,
  } = useScrollReveal();
  const tracked = useRef(false);

  const catequista = getBySlug("single");
  const paroquia = getBySlug("unlimited");
  const catequistaCents =
    catequista.prices.find(
      (item) => item.interval === "monthly" && item.isActive,
    )?.unitAmountCents ?? 0;
  const paroquiaCents =
    paroquia.prices.find((item) => item.interval === "monthly" && item.isActive)
      ?.unitAmountCents ?? 0;

  const ladderRaw = tr("growth.ladder", { returnObjects: true });
  const ladder = Array.isArray(ladderRaw) ? (ladderRaw as LadderItem[]) : [];
  const storiesRaw = tr("growth.stories", { returnObjects: true });
  const stories = Array.isArray(storiesRaw) ? (storiesRaw as StoryItem[]) : [];
  const eyebrow = String(
    tr("growth.eyebrow") || tr("pricing_eyebrow") || "",
  ).trim();
  const subtitle = String(
    tr("growth.subtitle") || tr("pricing_subtitle") || "",
  ).trim();

  const dioceseHref = getSalesWhatsAppUrl(t("sales_whatsapp.prefill"));

  useEffect(() => {
    if (!isVisible || tracked.current) return;
    tracked.current = true;
    trackMarketingEvent("pricing_viewed", {
      landing: ns,
      placement: "landing_growth_pricing",
    });
    trackViewPricing({
      plan_ids: ["single", "unlimited", "diocese"],
      content_name: "Planos Catechis Landing Growth",
    });
  }, [isVisible, ns]);

  return (
    <section
      id="planos"
      className="scroll-mt-20 bg-background"
      data-landing-growth-pricing
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div
          ref={headerRef}
          className={cn("mx-auto max-w-2xl space-y-3 text-center", headerClass)}
        >
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
            {tr("growth.title")}
          </h2>
          <div
            className="mx-auto h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
            aria-hidden
          />
          {subtitle ? (
            <p className="text-muted-foreground leading-relaxed">{subtitle}</p>
          ) : null}
        </div>

        {ladder.length > 0 ? (
          <ol className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-2 sm:flex-row sm:items-stretch sm:justify-center sm:gap-0">
            {ladder.map((item, index) => (
              <li
                key={`${item.label}-${item.step}`}
                className="flex flex-col items-center sm:flex-1 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-[7.5rem] flex-col items-center text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="font-brand-display mt-1 text-sm font-semibold text-brand-ink">
                    {item.step}
                  </span>
                </div>
                {index < ladder.length - 1 ? (
                  <>
                    <ArrowDown
                      className="mt-1 h-4 w-4 text-brand-gold/80 sm:hidden"
                      aria-hidden
                    />
                    <ArrowRight
                      className="mx-1 hidden h-4 w-4 shrink-0 text-brand-gold/80 sm:block"
                      aria-hidden
                    />
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <PlanCard
            name={landingCopy(tr, "plans.single.name", localize("single").name)}
            audience={landingCopy(tr, "plans.single.audience", "")}
            desc={landingCopy(tr, "plans.single.desc", "")}
            price={formatPrice(catequistaCents)}
            period={String(tr("per_month"))}
            cta={String(tr("price_cta_single"))}
            href="/signup?plan=single"
            ns={ns}
            planId="single"
            monthlyCents={catequistaCents}
          />
          <PlanCard
            name={landingCopy(
              tr,
              "plans.unlimited.name",
              localize("unlimited").name,
            )}
            audience={landingCopy(tr, "plans.unlimited.audience", "")}
            desc={landingCopy(tr, "plans.unlimited.desc", "")}
            price={formatPrice(paroquiaCents)}
            period={String(tr("per_month"))}
            cta={String(tr("price_cta_unlimited"))}
            href="/signup?plan=unlimited"
            ns={ns}
            planId="unlimited"
            monthlyCents={paroquiaCents}
            highlighted
          />
          <PlanCard
            name={landingCopy(tr, "plans.diocese.name", "Plano Diocese")}
            audience={landingCopy(tr, "plans.diocese.audience", "")}
            desc={landingCopy(tr, "plans.diocese.desc", "")}
            price={landingCopy(tr, "plans.diocese.price", "Sob consulta")}
            period=""
            cta={String(tr("price_cta_diocese"))}
            href={dioceseHref}
            ns={ns}
            planId="diocese"
            monthlyCents={0}
            external
          />
        </div>

        {stories.length > 0 ? (
          <ol className="mt-12 grid gap-8 border-t border-border/60 pt-10 sm:grid-cols-3">
            {stories.map((story, index) => (
              <li key={story.title} className="space-y-2">
                <span className="font-brand-display block text-[1.5rem] font-semibold tabular-nums leading-none text-brand-gold/80">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-brand-display text-[1.05rem] font-semibold tracking-tight text-brand-ink">
                  {story.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {story.desc}
                </p>
              </li>
            ))}
          </ol>
        ) : null}

        <p className="mt-10 text-center text-sm text-muted-foreground">
          <Link
            to="/pricing"
            className="font-medium text-brand-ink underline underline-offset-2 hover:text-brand-ink-soft"
            onClick={() =>
              trackMarketingEvent("primary_cta_clicked", {
                landing: ns,
                placement: "growth_pricing_compare",
                destination: "/pricing",
              })
            }
          >
            {tr("growth.compare")}
          </Link>
        </p>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  audience,
  desc,
  price,
  period,
  cta,
  href,
  ns,
  planId,
  monthlyCents,
  highlighted = false,
  external = false,
}: {
  name: string;
  audience: string;
  desc: string;
  price: string;
  period: string;
  cta: string;
  href: string;
  ns: string;
  planId: string;
  monthlyCents: number;
  highlighted?: boolean;
  external?: boolean;
}) {
  const onClick = () => {
    trackMarketingEvent("primary_cta_clicked", {
      landing: ns,
      placement: "growth_pricing_plan",
      destination: href,
      plan: planId,
    });
    if (!external && monthlyCents > 0) {
      trackLead({
        content_name: name,
        plan_id: planId,
        content_ids: [planId],
        value: Number((monthlyCents / 100).toFixed(2)),
        currency: "BRL",
      });
    }
  };

  const ctaClass = highlighted
    ? "rounded-sm bg-brand-gold text-brand-ink shadow-none hover:bg-brand-gold/90 hover:text-brand-ink"
    : undefined;

  const ctaInner = (
    <>
      {cta}
      <ArrowRight className="h-4 w-4 shrink-0" />
    </>
  );

  return (
    <div
      id={`planos-${planId}`}
      className={cn(
        "flex flex-col rounded-sm border p-6",
        highlighted
          ? "border-brand-gold/50 bg-white shadow-elevation-sm ring-1 ring-brand-gold/20"
          : "border-border/70 bg-card",
      )}
    >
      {audience ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {audience}
        </p>
      ) : null}
      <h3 className="font-brand-display mt-2 text-xl font-semibold tracking-tight text-brand-ink">
        {name}
      </h3>
      <div className="mt-3 flex flex-wrap items-baseline gap-1">
        <span className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink">
          {price}
        </span>
        {period ? (
          <span className="text-sm text-muted-foreground">{period}</span>
        ) : null}
      </div>
      {desc ? (
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {desc}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <Button
        size="lg"
        variant={highlighted ? undefined : "default"}
        asChild
        className={cn("mt-6 w-full", ctaClass)}
      >
        {external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
          >
            {ctaInner}
          </a>
        ) : (
          <Link to={href} onClick={onClick}>
            {ctaInner}
          </Link>
        )}
      </Button>
    </div>
  );
}

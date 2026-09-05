import { Link, useSearchParams } from "react-router";
import { ArrowRight, CheckCircle2, Sparkles, Users, Wifi } from "lucide-react";
import type { LandingHeroVisual } from "../landingCampaigns";
import { useLandingText } from "../hooks/useLandingText";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { BrowserFrame } from "./BrowserFrame";
import { AppProductMock, PhoneAttendanceMock } from "./mockups/AppProductMock";

/**
 * Editorial hero: brand type, split layout, product in browser frame.
 * Single CTA → trial. No prices / payment language.
 */
export function HeroSection({
  ns = "landing",
  responsiveCtas = false,
  showProductImage = true,
  variant = "editorial",
  visual = "product",
  campaign: campaignName,
}: {
  ns?: string;
  responsiveCtas?: boolean;
  showProductImage?: boolean;
  variant?: "editorial" | "centered";
  visual?: LandingHeroVisual;
  campaign?: string;
}) {
  const tr = useLandingText(ns);
  const [searchParams] = useSearchParams();
  const campaign =
    searchParams.get("utm_campaign") ||
    searchParams.get("campaign") ||
    campaignName;
  const signupParams = new URLSearchParams();
  if (campaign) signupParams.set("campaign", campaign);
  for (const key of ["plan", "interval"]) {
    const value = searchParams.get(key);
    if (value) signupParams.set(key, value);
  }
  const signupHref = `/signup${
    signupParams.size ? `?${signupParams.toString()}` : ""
  }`;
  const isEditorial = variant === "editorial";
  const ctaClassName = responsiveCtas
    ? "h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:min-w-[220px] sm:px-8"
    : "sm:min-w-[220px]";

  const line2 = tr("hero.headline_line2");
  const hasLine2 = typeof line2 === "string" && line2.trim().length > 0;

  const trustRaw = tr("hero.trust_signals");
  const trustParts =
    typeof trustRaw === "string" && trustRaw.includes("•")
      ? trustRaw
          .split("•")
          .map((s) => s.trim())
          .filter(Boolean)
      : typeof trustRaw === "string" && trustRaw.includes("·")
        ? trustRaw
            .split("·")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

  const ctaHelper = tr("hero.cta_helper");
  const hasCtaHelper =
    typeof ctaHelper === "string" && ctaHelper.trim().length > 0;

  const ctaBlock = (
    <div
      className={cn(
        "flex flex-col gap-4",
        isEditorial ? "items-stretch sm:items-start" : "items-center",
        responsiveCtas && "w-full sm:w-auto",
      )}
    >
      <Button
        size="xl"
        variant="default"
        asChild
        className={cn("rounded-sm shadow-none", ctaClassName)}
      >
        <Link
          to={signupHref}
          onClick={() =>
            trackMarketingEvent("primary_cta_clicked", {
              landing: ns,
              placement: "hero",
              destination: signupHref,
              campaign: campaign || null,
            })
          }
        >
          {tr("hero.cta_primary")}
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </Button>

      {hasCtaHelper ? (
        <p
          className={cn(
            "text-sm text-muted-foreground leading-relaxed",
            isEditorial ? "max-w-sm" : "max-w-sm text-center",
          )}
        >
          {ctaHelper}
        </p>
      ) : null}

      {trustParts.length > 0 ? (
        <ul
          className={cn(
            "flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-brand-ink/85",
            !isEditorial && "justify-center",
          )}
        >
          {trustParts.map((part) => (
            <li key={part} className="inline-flex items-center gap-1.5">
              <span
                className="h-1 w-1 rounded-full bg-brand-ink/70"
                aria-hidden
              />
              {part}
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn(
            "text-sm text-muted-foreground leading-relaxed",
            isEditorial ? "max-w-sm" : "max-w-sm text-center",
          )}
        >
          {tr("hero.click_trigger")}
        </p>
      )}
    </div>
  );

  const badge = String(tr("hero.badge") || "").trim();

  const copyBlock = (
    <div
      className={cn(
        "flex flex-col",
        isEditorial
          ? "text-left justify-center space-y-5 lg:space-y-6 lg:pr-4"
          : "text-center space-y-6",
      )}
    >
      {badge ? (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {badge}
        </p>
      ) : null}

      <h1
        className={cn(
          "font-brand-display font-semibold tracking-tight text-brand-ink text-balance",
          isEditorial
            ? "text-[2.05rem] sm:text-[2.75rem] lg:text-[3.15rem] leading-[1.14]"
            : "text-3xl sm:text-5xl leading-[1.12]",
        )}
      >
        {tr("hero.headline_line1")}
        {hasLine2 ? (
          <>
            <br />
            <span className="text-brand-ink">{line2}</span>
          </>
        ) : null}
      </h1>

      <div
        className={cn("h-px w-14 bg-brand-gold", !isEditorial && "mx-auto")}
        aria-hidden
      />

      <p
        className={cn(
          "text-[15px] sm:text-lg text-muted-foreground leading-relaxed",
          isEditorial ? "max-w-[42ch]" : "max-w-xl mx-auto",
        )}
      >
        {tr("hero.subheadline")}
      </p>

      <div className={cn(isEditorial ? "pt-1" : "pt-0")}>{ctaBlock}</div>
    </div>
  );

  const showPhoneOverlay = isEditorial && visual === "product";

  const productBlock = showProductImage ? (
    <div
      className={cn(
        isEditorial ? "relative lg:pl-2" : "mt-10 mx-auto max-w-2xl",
        showPhoneOverlay && "lg:pb-8 lg:pr-10",
      )}
    >
      {isEditorial && (
        <div
          className="pointer-events-none absolute -inset-3 -z-10 rounded-sm bg-brand-ink/[0.03] sm:-inset-4"
          aria-hidden
        />
      )}
      <BrowserFrame
        url="catechis.app"
        aspect="natural"
        className={cn(isEditorial && "lg:translate-y-1")}
      >
        {visual === "product" ? (
          <AppProductMock ns={ns} />
        ) : (
          <CampaignHeroVisual
            visual={visual}
            title={tr("hero.visual_title")}
            items={[
              tr("hero.visual_item_1"),
              tr("hero.visual_item_2"),
              tr("hero.visual_item_3"),
            ]}
          />
        )}
      </BrowserFrame>
      {showPhoneOverlay ? (
        <div className="pointer-events-none absolute -bottom-4 -right-1 hidden w-[9.75rem] lg:block">
          <PhoneAttendanceMock />
        </div>
      ) : null}
    </div>
  ) : null;

  if (!isEditorial) {
    return (
      <section data-landing-hero className="relative">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
          {copyBlock}
          {productBlock}
        </div>
      </section>
    );
  }

  return (
    <section data-landing-hero className="relative border-b border-border/50">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(210_45%_97%)_0%,hsl(0_0%_100%)_55%)]" />
      <div className="relative mx-auto max-w-6xl overflow-x-clip px-4 py-14 sm:py-16 lg:overflow-visible lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 xl:gap-16">
          {copyBlock}
          {productBlock}
        </div>
      </div>
    </section>
  );
}

function CampaignHeroVisual({
  visual,
  title,
  items,
}: {
  visual: Exclude<LandingHeroVisual, "product">;
  title: string;
  items: string[];
}) {
  const Icon =
    visual === "ai" ? Sparkles : visual === "attendance" ? CheckCircle2 : Users;
  return (
    <div
      className="min-h-[300px] bg-surface-subtle p-4 sm:p-6"
      role="img"
      aria-label={title}
    >
      <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-brand-ink text-white">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Catequese Viva
            </p>
            <p className="text-base font-semibold text-brand-ink">{title}</p>
          </div>
        </div>
        {visual === "attendance" && (
          <Wifi className="h-5 w-5 text-success" aria-hidden />
        )}
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item}
            className="flex min-h-14 items-center gap-3 rounded-sm border border-border/70 bg-white px-4 py-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-sm font-semibold text-brand-ink">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-brand-ink">{item}</span>
            <CheckCircle2
              className="ml-auto h-4 w-4 text-success"
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
  );
}

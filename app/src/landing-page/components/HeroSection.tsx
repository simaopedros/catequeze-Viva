import { Link, useSearchParams } from "react-router";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import type { LandingHeroVisual } from "../landingCampaigns";
import { useLandingText } from "../hooks/useLandingText";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { BrowserFrame } from "./BrowserFrame";
import { AppProductMock } from "./mockups/AppProductMock";

/**
 * Centered editorial hero: promise, one primary CTA, product below.
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
  const isCentered = variant === "centered";
  const ctaClassName = responsiveCtas
    ? "h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:min-w-[220px] sm:px-8"
    : "sm:min-w-[220px]";

  const line2 = tr("hero.headline_line2");
  const hasLine2 = typeof line2 === "string" && line2.trim().length > 0;
  const secondary = String(tr("hero.cta_secondary") || "").trim();
  const secondaryHref = String(
    tr("hero.cta_secondary_href") || "/#como",
  ).trim();

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
        "flex flex-col gap-3",
        isCentered ? "items-center" : "items-stretch sm:items-start",
        responsiveCtas && "w-full sm:w-auto",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2.5 sm:flex-row sm:items-center",
          isCentered && "justify-center",
          responsiveCtas && "w-full sm:w-auto",
        )}
      >
        <Button
          size="xl"
          variant="default"
          asChild
          className={cn("rounded-md shadow-none", ctaClassName)}
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
        {isCentered && secondary ? (
          <Button
            size="xl"
            variant="outline"
            asChild
            className={cn("rounded-md shadow-none", ctaClassName)}
          >
            <a href={secondaryHref}>{secondary}</a>
          </Button>
        ) : null}
      </div>

      {hasCtaHelper ? (
        <p
          className={cn(
            "text-sm text-muted-foreground leading-relaxed",
            isCentered ? "max-w-sm text-center" : "max-w-sm",
          )}
        >
          {ctaHelper}
        </p>
      ) : null}

      {trustParts.length > 0 ? (
        <ul
          className={cn(
            "flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-medium text-muted-foreground",
            isCentered && "justify-center",
          )}
        >
          {trustParts.map((part) => (
            <li key={part} className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" aria-hidden />
              {part}
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn(
            "text-sm text-muted-foreground leading-relaxed",
            isCentered ? "max-w-sm text-center" : "max-w-sm",
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
        isCentered
          ? "mx-auto max-w-[790px] space-y-5 text-center"
          : "justify-center space-y-5 text-left lg:space-y-6 lg:pr-4",
      )}
    >
      {badge ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold-muted">
          {badge}
        </p>
      ) : null}

      <h1
        className={cn(
          "font-brand-display font-medium tracking-tight text-brand-ink text-balance",
          isCentered
            ? "text-[2.75rem] leading-[0.98] sm:text-6xl lg:text-[4.75rem]"
            : "text-[2.05rem] leading-[1.14] sm:text-[2.75rem] lg:text-[3.15rem] font-semibold",
        )}
      >
        {tr("hero.headline_line1")}
        {hasLine2 ? (
          <>
            <br />
            {line2}
          </>
        ) : null}
      </h1>

      <p
        className={cn(
          "text-[15px] leading-relaxed text-muted-foreground sm:text-lg",
          isCentered ? "mx-auto max-w-[42rem]" : "max-w-[42ch]",
        )}
      >
        {tr("hero.subheadline")}
      </p>

      <div className="pt-1">{ctaBlock}</div>
    </div>
  );

  const productBlock = showProductImage ? (
    <div
      className={cn(
        isCentered ? "mx-auto mt-12 w-full max-w-[900px]" : "relative",
      )}
    >
      <BrowserFrame
        url="catechis.app"
        aspect="natural"
        className="rounded-[14px] shadow-[0_25px_70px_rgba(9,32,53,0.12)]"
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
    </div>
  ) : null;

  if (isCentered) {
    return (
      <section data-landing-hero className="relative bg-white">
        <div className="mx-auto max-w-[70rem] px-5 py-14 sm:py-16 lg:py-[4.75rem]">
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

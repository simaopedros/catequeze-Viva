import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useLandingText } from "../hooks/useLandingText";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { BrowserFrame } from "./BrowserFrame";

/**
 * Editorial hero: brand type, split layout, product in browser frame.
 * Single CTA → trial. No prices / payment language.
 */
export function HeroSection({
  ns = "landing",
  responsiveCtas = false,
  showProductImage = true,
  variant = "editorial",
}: {
  ns?: string;
  responsiveCtas?: boolean;
  showProductImage?: boolean;
  variant?: "editorial" | "centered";
}) {
  const tr = useLandingText(ns);
  const isEditorial = variant === "editorial";
  const ctaClassName = responsiveCtas
    ? "h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:min-w-[220px] sm:px-8"
    : "sm:min-w-[220px]";

  const line2 = tr("hero.headline_line2");
  const hasLine2 = typeof line2 === "string" && line2.trim().length > 0;

  const trustRaw = tr("hero.trust_signals");
  const trustParts =
    typeof trustRaw === "string" && trustRaw.includes("•")
      ? trustRaw.split("•").map((s) => s.trim()).filter(Boolean)
      : typeof trustRaw === "string" && trustRaw.includes("·")
        ? trustRaw.split("·").map((s) => s.trim()).filter(Boolean)
        : [];

  const ctaBlock = (
    <div
      className={cn(
        "flex flex-col gap-4",
        isEditorial ? "items-stretch sm:items-start" : "items-center",
        responsiveCtas && "w-full sm:w-auto"
      )}
    >
      <Button size="xl" variant="default" asChild className={cn("rounded-md shadow-none", ctaClassName)}>
        <Link
          to="/signup"
          onClick={() =>
            trackMarketingEvent("primary_cta_clicked", {
              landing: ns,
              placement: "hero",
              destination: "/signup",
            })
          }
        >
          {tr("hero.cta_primary")}
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </Button>

      {trustParts.length > 0 ? (
        <ul
          className={cn(
            "flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground",
            !isEditorial && "justify-center"
          )}
        >
          {trustParts.map((part) => (
            <li key={part} className="inline-flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#D39A2B]" aria-hidden />
              {part}
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn(
            "text-sm text-muted-foreground leading-relaxed",
            isEditorial ? "max-w-sm" : "max-w-sm text-center"
          )}
        >
          {tr("hero.click_trigger")}
        </p>
      )}
    </div>
  );

  const copyBlock = (
    <div
      className={cn(
        "flex flex-col",
        isEditorial ? "text-left justify-center space-y-5 lg:space-y-6 lg:pr-4" : "text-center space-y-6"
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {tr("hero.badge")}
      </p>

      <h1
        className={cn(
          "font-semibold tracking-tight text-foreground text-balance",
          isEditorial
            ? "text-[2.05rem] sm:text-[2.75rem] lg:text-[3.15rem] leading-[1.14]"
            : "text-3xl sm:text-5xl leading-[1.12]"
        )}
        style={{ fontFamily: "var(--font-brand-display)" }}
      >
        {tr("hero.headline_line1")}
        {hasLine2 ? (
          <>
            <br className="hidden sm:block" />
            <span className="text-foreground"> {line2}</span>
          </>
        ) : null}
      </h1>

      <div className={cn("h-px w-14 bg-[#D39A2B]", !isEditorial && "mx-auto")} aria-hidden />

      <p
        className={cn(
          "text-[15px] sm:text-lg text-muted-foreground leading-relaxed",
          isEditorial ? "max-w-[36ch]" : "max-w-xl mx-auto"
        )}
      >
        {tr("hero.subheadline")}
      </p>

      <div className={cn(isEditorial ? "pt-1" : "pt-0")}>{ctaBlock}</div>
    </div>
  );

  const productBlock = showProductImage ? (
    <div
      className={cn(
        isEditorial
          ? "relative lg:pl-2"
          : "mt-10 mx-auto max-w-2xl"
      )}
    >
      {isEditorial && (
        <div
          className="pointer-events-none absolute -inset-3 -z-10 rounded-sm bg-[#071A2D]/[0.03] sm:-inset-4"
          aria-hidden
        />
      )}
      <BrowserFrame
        url="catechis.app"
        aspect="natural"
        className={cn(isEditorial && "lg:translate-y-1")}
      >
        <img
          src="/landing/hero-mobile-light.png"
          alt={tr("hero.image_alt")}
          className="block w-full h-auto"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </BrowserFrame>
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
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 xl:gap-16">
          {copyBlock}
          {productBlock}
        </div>
      </div>
    </section>
  );
}

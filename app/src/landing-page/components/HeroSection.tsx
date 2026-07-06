import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, GraduationCap, Sparkles } from "lucide-react";
import { useParallax } from "../hooks/useParallax";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { BrowserFrame } from "./BrowserFrame";
import { FeatureScreenshot } from "./FeatureScreenshot";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";

function useLandingCopy(ns: string) {
  const { t } = useTranslation(ns);
  const { t: tLanding } = useTranslation("landing");

  const tr = (key: string) => {
    const value = t(key);
    return typeof value === "string" && value !== key ? value : tLanding(key);
  };

  const trList = (key: string) => {
    const value = t(key, { returnObjects: true });
    if (Array.isArray(value)) return value as string[];
    const fallback = tLanding(key, { returnObjects: true });
    return Array.isArray(fallback) ? (fallback as string[]) : [];
  };

  const trObjects = <T,>(key: string, fallback: T): T => {
    const value = t(key, { returnObjects: true });
    if (value && typeof value === "object" && value !== key) return value as T;
    const fallbackValue = tLanding(key, { returnObjects: true });
    if (fallbackValue && typeof fallbackValue === "object" && fallbackValue !== key) return fallbackValue as T;
    return fallback;
  };

  return { tr, trList, trObjects };
}

type HeroAudience = {
  id: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  pill?: string;
  micro?: string;
};

export function HeroSection({ ns = "landing", responsiveCtas = false }: { ns?: string; responsiveCtas?: boolean }) {
  const { tr, trList, trObjects } = useLandingCopy(ns);
  const { ref: revealRef, className: revealClass } = useScrollReveal();
  const blobTopRef = useParallax<HTMLDivElement>({ factor: 0.04 });
  const blobBottomRef = useParallax<HTMLDivElement>({ factor: -0.03 });
  const mockupRef = useParallax<HTMLDivElement>({ factor: 0.06 });
  const ctaClassName = responsiveCtas ? "h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:px-10" : undefined;
  const subheadline = tr("hero.subheadline");
  const ctaSecondaryHref = tr("hero.cta_secondary_href");
  const [subheadlineIntro, ...subheadlineEmphasis] = subheadline.split("—");
  const heroHighlights = trList("hero.highlights");
  const heroAudiences = trObjects<HeroAudience[]>("hero.audiences", []);

  return (
    <section data-landing-hero className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div ref={blobTopRef} className="parallax-layer pointer-events-none absolute top-20 right-10 hidden h-72 w-72 rounded-full bg-primary/10 blur-3xl lg:block" />
      <div ref={blobBottomRef} className="parallax-layer pointer-events-none absolute bottom-10 left-10 hidden h-96 w-96 rounded-full bg-accent/10 blur-3xl lg:block" />
      <div ref={revealRef} className={`relative mx-auto max-w-6xl px-4 py-8 sm:py-14 md:py-20 lg:py-24 ${revealClass}`}>
        <div className="grid items-center gap-6 md:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
          <div className="space-y-4 text-center sm:space-y-5 lg:space-y-7 lg:text-left">
            <div className="inline-flex items-center gap-2">
              <Badge variant="brand" size="lg" className="gap-1.5 border-primary/10 bg-background/80 text-primary shadow-none backdrop-blur-sm">
                <GraduationCap className="h-3.5 w-3.5" />
                {tr("hero.badge")}
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              </Badge>
            </div>
            <h1 className="text-[2.25rem] font-bold leading-[1.04] tracking-tight text-balance sm:text-5xl lg:text-title-xxl">
              {tr("hero.headline_line1")}
              <br />
              <span className="text-gradient-primary">{tr("hero.headline_line2")}</span>
            </h1>
            <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-text-secondary sm:text-lg md:text-xl lg:mx-0">
              {subheadlineEmphasis.length > 0 ? (
                <>
                  {subheadlineIntro.trim()} — <span className="font-semibold text-foreground">{subheadlineEmphasis.join("—").trim()}</span>
                </>
              ) : (
                subheadline
              )}
            </p>
            {heroHighlights.length > 0 && (
              <ul className="mx-auto grid max-w-xl gap-2 text-left text-sm text-foreground sm:grid-cols-2 lg:mx-0 lg:max-w-2xl">
                {heroHighlights.map((highlight, index) => (
                  <li key={highlight} className={cn("flex items-start gap-2 rounded-lg px-1 py-1.5", index === 3 && "hidden sm:flex")}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className={cn("flex max-w-md mx-auto lg:mx-0 flex-col gap-1.5 justify-center lg:justify-start", responsiveCtas && "w-full sm:w-auto sm:max-w-none")}>
              <Button size="xl" variant="brand" asChild className={ctaClassName}>
                <Link to="/pricing" onClick={() => trackMarketingEvent("primary_cta_clicked", { landing: ns, placement: "hero", destination: "/pricing" })}>
                  {tr("hero.cta_primary")}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </Button>
              <p className="mx-auto max-w-sm text-center text-[11px] leading-relaxed text-text-secondary lg:mx-0 lg:text-left">{tr("hero.cta_helper")}</p>
            </div>
            {heroAudiences.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{tr("hero.audience_label")}</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {heroAudiences.map((audience) => (
                    <Link
                      key={audience.id}
                      to={audience.href}
                      onClick={() =>
                        trackMarketingEvent("secondary_cta_clicked", {
                          landing: ns,
                          placement: `hero_audience_${audience.id}`,
                          destination: audience.href,
                        })
                      }
                      className="rounded-2xl border border-border/70 bg-background/80 p-4 text-left transition-colors hover:border-primary/30 hover:bg-background"
                    >
                      {audience.pill && (
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-text-secondary">
                          {audience.pill}
                        </span>
                      )}
                      <p className="mt-2 text-sm font-semibold text-foreground">{audience.title}</p>
                      <p className="mt-1 text-[13px] leading-5 text-text-secondary sm:hidden">{audience.micro ?? audience.desc}</p>
                      <p className="mt-1 hidden text-xs leading-relaxed text-text-secondary sm:block">{audience.desc}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        {audience.cta}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="hidden space-y-2 sm:block">
              <p className="text-body-xs text-text-secondary">{tr("hero.trust_signals")}</p>
              <Link
                to={ctaSecondaryHref}
                onClick={() => trackMarketingEvent("secondary_cta_clicked", { landing: ns, placement: "hero_contextual", destination: ctaSecondaryHref })}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
              >
                {tr("hero.cta_secondary")}
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>
          </div>
          <div ref={mockupRef} className="parallax-layer relative mx-auto hidden w-full max-w-md md:block md:max-w-xl lg:max-w-none">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 blur-2xl opacity-60" />
            <BrowserFrame className="relative" url="catechis.app/painel">
              <FeatureScreenshot id="ai-planner" alt="Gerador de encontros da Catequese Viva com roteiro, leitura biblica e atividade" loading="eager" fetchPriority="high" />
            </BrowserFrame>
          </div>
        </div>
      </div>
    </section>
  );
}

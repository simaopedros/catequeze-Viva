import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useLandingText } from "../hooks/useLandingText";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { Button } from "../../client/components/ui/button";

export function StepsSection({
  ns = "landing",
  responsiveCtas = false,
  ctaAfterSteps = false,
}: {
  ns?: string;
  responsiveCtas?: boolean;
  showEndowed?: boolean;
  ctaAfterSteps?: boolean;
}) {
  const tr = useLandingText(ns);
  const steps = tr("steps", { returnObjects: true }) as any[];
  const list = Array.isArray(steps) ? steps : [];
  const eyebrow = String(tr("steps_eyebrow") || "").trim();
  const subtitle = String(tr("steps_subtitle") || "").trim();

  const ctaButton = (
    <Button
      size="lg"
      variant="default"
      asChild
      className={cn(
        "rounded-sm shadow-none shrink-0",
        responsiveCtas && "h-auto min-h-11 w-full max-w-sm lg:w-auto",
      )}
    >
      <Link
        to="/signup"
        onClick={() =>
          trackMarketingEvent("primary_cta_clicked", {
            landing: ns,
            placement: "steps",
            destination: "/signup",
          })
        }
      >
        {tr("steps_cta")}
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    </Button>
  );

  return (
    <section
      id="como"
      className="scroll-mt-20 border-y border-border/50 bg-background"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div
          className={cn(
            "flex flex-col gap-8 sm:gap-10",
            !ctaAfterSteps && "lg:flex-row lg:items-end lg:justify-between",
          )}
        >
          <div className="max-w-md space-y-3">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
              {tr("steps_title")}
            </h2>
            <div className="h-px w-16 bg-gradient-to-r from-brand-gold to-transparent" aria-hidden />
            {subtitle ? (
              <p className="text-muted-foreground leading-relaxed">{subtitle}</p>
            ) : null}
          </div>

          {!ctaAfterSteps ? ctaButton : null}
        </div>

        <ol className="mt-12 grid gap-8 sm:mt-14 sm:grid-cols-3 sm:gap-10">
          {list.map((step: any, index: number) => (
            <li key={step.title} className="relative space-y-3">
              {/* Mesmo tratamento da OutcomesSection: as duas seções mostram
                  o mesmo padrão de passos numerados e antes divergiam — aqui o
                  número era ink a 12% de opacidade, praticamente invisível
                  sobre o canvas, enquanto lá era dourado. */}
              <span
                className="font-brand-display block text-[2rem] font-semibold tabular-nums leading-none text-brand-gold/80"
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-brand-display text-[1.05rem] font-semibold tracking-tight text-brand-ink">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[15rem]">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>

        {ctaAfterSteps ? <div className="mt-10">{ctaButton}</div> : null}
      </div>
    </section>
  );
}

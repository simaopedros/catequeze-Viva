import {
  Building2,
  GraduationCap,
  Rocket,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router";
import { Badge } from "../../client/components/ui/badge";
import { Button } from "../../client/components/ui/button";
import { Card } from "../../client/components/ui/card";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { ArrowRight } from "lucide-react";
import { useLandingText } from "../hooks/useLandingText";

const STAT_ICONS = [GraduationCap, Building2, Smartphone] as const;

/**
 * Launch-stage social proof without fabricated testimonials.
 * Emphasizes fit by audience, product guarantees, and early-adopter CTA.
 */
export function ProofSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const { ref, className } = useScrollReveal();

  const stats = tr("proof.stats", { returnObjects: true });
  const statList = Array.isArray(stats)
    ? (stats as Array<{ title: string; desc: string }>)
    : [];
  const chips = tr("proof.chips", { returnObjects: true });
  const chipList = Array.isArray(chips) ? (chips as string[]) : [];
  const promises = tr("proof.promises", { returnObjects: true });
  const promiseList = Array.isArray(promises) ? (promises as string[]) : [];

  return (
    <section className="border-y bg-background">
      <div
        ref={ref}
        className={`mx-auto max-w-6xl px-4 py-12 md:py-16 ${className}`}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch">
          <div className="space-y-5">
            <div className="space-y-2">
              <Badge
                variant="secondary"
                className="inline-flex gap-1.5 border-0 bg-muted/60 text-text-secondary shadow-none"
              >
                <Rocket className="h-3.5 w-3.5" />
                {tr("proof.badge")}
              </Badge>
              <h2 className="font-brand-display text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
                {tr("proof.title")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
                {tr("proof.subtitle")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {statList.map((stat, index) => {
                const Icon = STAT_ICONS[index] ?? GraduationCap;
                return (
                  <div
                    key={stat.title}
                    // bg-card + elevação: sobre o canvas off-white, um card em
                    // bg-background com borda não se destaca de nada — é a
                    // doutrina plana antiga, que o app já não usa.
                    className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-elevation-sm"
                  >
                    <div className="inline-flex rounded-md bg-muted p-2 text-brand-ink">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink">
                      {stat.title}
                    </p>
                    <p className="text-xs leading-relaxed text-text-secondary">
                      {stat.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {chipList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chipList.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-sm bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Card
            variant="flat"
            className="rounded-lg border border-brand-ink/15 bg-brand-ink/[0.03] p-6 shadow-elevation-sm flex flex-col justify-between gap-5"
          >
            <div className="space-y-4">
              <div className="inline-flex rounded-md bg-brand-ink/8 p-2.5 text-brand-ink">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-brand-display text-lg font-semibold tracking-tight text-brand-ink">
                  {tr("proof.launch_title")}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {tr("proof.launch_text")}
                </p>
              </div>
              {promiseList.length > 0 && (
                <ul className="space-y-2">
                  {promiseList.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-brand-ink"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-brand-ink" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Button size="lg" variant="brand" asChild className="w-full">
                <Link
                  to="/signup"
                  onClick={() =>
                    trackMarketingEvent("primary_cta_clicked", {
                      landing: ns,
                      placement: "proof_launch",
                      destination: "/signup",
                    })
                  }
                >
                  {tr("proof.launch_cta")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {tr("proof.launch_helper")}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

import { useTranslation } from "react-i18next";
import { SHOWCASES } from "../content/landingContent";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { FeatureShowcase } from "./FeatureShowcase";

/** Three core product demos for the main landing (with mockups). */
const HOME_FEATURE_ORDER = [
  "attendance",
  "ai-planner",
  "family-portal",
] as const;

/**
 * Compact features block: real UI mockups + benefits for the three
 * highest-conversion capabilities (attendance, AI, family portal).
 */
export function SimpleFeaturesSection({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { t: tLanding } = useTranslation("landing");
  const { ref: headerRef, className: headerClass } = useScrollReveal();

  const title = (() => {
    const v = t("simple_features.title");
    return typeof v === "string" && v !== "simple_features.title"
      ? v
      : tLanding("simple_features.title");
  })();
  const subtitle = (() => {
    const v = t("simple_features.subtitle");
    return typeof v === "string" && v !== "simple_features.subtitle"
      ? v
      : tLanding("simple_features.subtitle");
  })();

  const showcases = HOME_FEATURE_ORDER.map((id) =>
    SHOWCASES.find((s) => s.id === id),
  ).filter(Boolean) as typeof SHOWCASES;

  return (
    <section id="recursos" className="scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 pt-16 md:pt-20 pb-4">
        <div ref={headerRef} className={`text-center space-y-3 ${headerClass}`}>
          <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {showcases.map((showcase) => (
          <FeatureShowcase key={showcase.id} showcase={showcase} ns={ns} />
        ))}
      </div>
    </section>
  );
}

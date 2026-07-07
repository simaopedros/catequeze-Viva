import { useTranslation } from "react-i18next";
import { ClipboardCheck, Sparkles, Heart } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Card } from "../../client/components/ui/card";

const FEATURES = [
  {
    id: "attendance",
    icon: ClipboardCheck,
    titleKey: "simple_features.attendance.title",
    descKey: "simple_features.attendance.desc",
    bullets: [
      "simple_features.attendance.b1",
      "simple_features.attendance.b2",
      "simple_features.attendance.b3",
    ],
  },
  {
    id: "ai",
    icon: Sparkles,
    titleKey: "simple_features.ai.title",
    descKey: "simple_features.ai.desc",
    bullets: [
      "simple_features.ai.b1",
      "simple_features.ai.b2",
      "simple_features.ai.b3",
    ],
  },
  {
    id: "family",
    icon: Heart,
    titleKey: "simple_features.family.title",
    descKey: "simple_features.family.desc",
    bullets: [
      "simple_features.family.b1",
      "simple_features.family.b2",
      "simple_features.family.b3",
    ],
  },
] as const;

export function SimpleFeaturesSection({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();

  return (
    <section id="recursos" className="scroll-mt-20 py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-4">
        <div ref={headerRef} className={`text-center mb-12 space-y-3 ${headerClass}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">{t("simple_features.title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("simple_features.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} ns={ns} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index, ns }: { feature: (typeof FEATURES)[number]; index: number; ns: string }) {
  const { t } = useTranslation(ns);
  const { ref, className } = useScrollReveal({ delay: index * 80 });
  const Icon = feature.icon;

  return (
    <Card ref={ref} variant="interactive" className={`p-6 space-y-4 ${className}`}>
      <div className="inline-flex rounded-xl bg-primary/10 p-3">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-bold">{t(feature.titleKey)}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{t(feature.descKey)}</p>
      <ul className="space-y-2">
        {feature.bullets.map((bulletKey) => (
          <li key={bulletKey} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <span>{t(bulletKey)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

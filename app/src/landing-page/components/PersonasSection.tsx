import { useTranslation } from "react-i18next";
import {
  GraduationCap,
  Church,
  Heart,
  UserCheck,
  Building2,
} from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const ICONS = [GraduationCap, Church, Heart, UserCheck, Building2];

export function PersonasSection({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const personasText = t("personas", { returnObjects: true }) as any[];

  // Merge i18n text with static icons
  const personas = (Array.isArray(personasText) ? personasText : []).map(
    (p: any, i: number) => ({
      title: p.title,
      desc: p.desc,
      icon: ICONS[i],
    }),
  );

  return (
    <section className="border-y border-border/70 bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div
          ref={headerRef}
          className={`text-center mb-10 space-y-3 ${headerClass}`}
        >
          <div className="mx-auto h-px w-16 bg-gradient-to-r from-brand-gold to-transparent" aria-hidden />
          <h2
            className="text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {t("personas_title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("personas_subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {(Array.isArray(personas) ? personas : []).map(
            (persona: any, index: number) => (
              <PersonaCard
                key={persona.title}
                persona={persona}
                delay={index * 50}
                icon={ICONS[index]}
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function PersonaCard({
  persona,
  delay,
  icon: Icon,
}: {
  persona: any;
  delay: number;
  icon: any;
}) {
  const { ref, className } = useScrollReveal({ delay });

  return (
    <div
      ref={ref}
      className={`space-y-3 rounded-sm border border-border/70 bg-white p-5 transition-colors hover:border-brand-ink/25 ${className}`}
    >
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-brand-ink">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-brand-ink">{persona.title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {persona.desc}
      </p>
    </div>
  );
}

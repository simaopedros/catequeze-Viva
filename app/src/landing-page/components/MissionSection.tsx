import { useTranslation } from "react-i18next";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { BrandMedallion } from "../../client/components/brand/Brand";

export function MissionSection({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref, className } = useScrollReveal();

  return (
    <section className="border-y border-brand-ink/10">
      <div
        ref={ref}
        className={`mx-auto max-w-3xl space-y-4 px-4 py-20 text-center ${className}`}
      >
        <BrandMedallion className="mb-2" />
        <div className="mx-auto h-px w-16 bg-gradient-to-r from-brand-gold to-transparent" aria-hidden />
        <h2
          className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl"
        >
          {t("mission_title")}
        </h2>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t("mission_text")}
        </p>
      </div>
    </section>
  );
}

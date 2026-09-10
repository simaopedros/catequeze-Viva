import { useTranslation } from "react-i18next";
import { ShieldCheck, Lock, CreditCard, DatabaseZap } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Card } from "../../client/components/ui/card";

const TRUST_ITEMS = [
  { key: "lgpd", icon: ShieldCheck },
  { key: "encryption", icon: Lock },
  { key: "no_card", icon: CreditCard },
  { key: "data_control", icon: DatabaseZap },
] as const;

export function TrustSection({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const items = t("trust", { returnObjects: true }) as any[];

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-brand-ink/10 bg-brand-paper/50">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div
          ref={headerRef}
          className={`text-center mb-12 space-y-3 ${headerClass}`}
        >
          <h2 className="font-brand-display text-title-xl font-semibold tracking-tight text-brand-ink">
            {t("trust_title")}
          </h2>
          <p className="text-body-lg text-text-secondary max-w-2xl mx-auto">
            {t("trust_subtitle")}
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item, index) => {
            const data = items[index] ?? {};
            return (
              <TrustCard
                key={item.key}
                icon={item.icon}
                title={data.title}
                desc={data.desc}
                delay={index * 60}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustCard({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: typeof ShieldCheck;
  title: string;
  desc: string;
  delay: number;
}) {
  const { ref, className } = useScrollReveal({ delay });
  return (
    <Card
      ref={ref}
      variant="flat"
      className={`p-6 space-y-3 text-center ${className}`}
    >
      <div className="inline-flex rounded-sm bg-brand-ink/8 p-2.5">
        <Icon className="h-5 w-5 text-brand-ink" />
      </div>
      <h3 className="font-brand-display text-body-sm font-semibold tracking-tight text-brand-ink">
        {title}
      </h3>
      <p className="text-body-xs text-text-secondary leading-relaxed">{desc}</p>
    </Card>
  );
}

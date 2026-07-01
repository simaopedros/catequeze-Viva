import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Building2, Landmark, User } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";

type PricingPath = "catechist" | "parish" | "diocese";

export function PricingPreviewSection({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { t: tp } = useTranslation("public");
  const { ref: headerRef, className: headerClass } = useScrollReveal();

  const cards: { key: PricingPath; icon: typeof User; title: string; description: string; supporting: string; cta: string; }[] = [
    { key: "catechist", icon: User, title: tp("pricing.path_cards.catechist.title"), description: tp("pricing.path_cards.catechist.description"), supporting: tp("pricing.path_cards.catechist.supporting"), cta: tp("pricing.path_cards.catechist.cta") },
    { key: "parish", icon: Building2, title: tp("pricing.path_cards.parish.title"), description: tp("pricing.path_cards.parish.description"), supporting: tp("pricing.path_cards.parish.supporting"), cta: tp("pricing.path_cards.parish.cta") },
    { key: "diocese", icon: Landmark, title: tp("pricing.path_cards.diocese.title"), description: tp("pricing.path_cards.diocese.description"), supporting: tp("pricing.path_cards.diocese.supporting"), cta: tp("pricing.path_cards.diocese.cta") },
  ];

  return (
    <section id="planos" className="scroll-mt-20 max-w-6xl mx-auto px-4 py-20">
      <div ref={headerRef} className={`text-center mb-10 space-y-3 ${headerClass}`}>
        <h2 className="text-3xl sm:text-4xl font-bold">{t("pricing_title")}</h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("pricing_subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {cards.map((card, index) => (
          <PricingPathCard key={card.key} keyName={card.key} icon={card.icon} title={card.title} description={card.description} supporting={card.supporting} cta={card.cta} delay={index * 60} ns={ns} />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        <Link to="/pricing" onClick={() => trackMarketingEvent("primary_cta_clicked", { landing: ns, placement: "landing_pricing_footer", destination: "/pricing" })} className="underline hover:text-foreground transition-colors">
          {t("compare_plans")}
        </Link>
      </p>
    </section>
  );
}

function PricingPathCard({ keyName, icon: Icon, title, description, supporting, cta, delay, ns }: { keyName: PricingPath; icon: typeof User; title: string; description: string; supporting: string; cta: string; delay: number; ns: string; }) {
  const { ref, className } = useScrollReveal({ delay });

  return (
    <Link ref={ref as any} to="/pricing" onClick={() => trackMarketingEvent("primary_cta_clicked", { landing: ns, placement: "landing_pricing_path", destination: "/pricing", path: keyName })} className={`rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${className}`}>
      <div className="inline-flex rounded-xl bg-muted p-3 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 space-y-2">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">{supporting}</p>
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

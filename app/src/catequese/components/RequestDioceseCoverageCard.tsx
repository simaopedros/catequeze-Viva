import { useTranslation } from "react-i18next";
import { Building2, ShieldCheck } from "lucide-react";
import { SalesWhatsAppCta } from "../../client/components/SalesWhatsAppCta";

export function RequestDioceseCoverageCard({
  parishName,
  dioceseName,
  planInherited,
}: {
  parishName: string;
  dioceseName?: string | null;
  planInherited?: boolean;
}) {
  const { t } = useTranslation("billing");

  if (planInherited && dioceseName) {
    return (
      <section
        data-testid="diocese-covered-card"
        className="rounded-sm border border-brand-ink/20 bg-brand-ink/5 p-5 flex items-start gap-3"
      >
        <ShieldCheck className="h-5 w-5 text-brand-ink shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-brand-ink">
            {t("covered_by_named", { name: dioceseName })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("request_diocese_desc")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="cobertura-diocese"
      data-testid="request-diocese-card"
      className="rounded-sm border border-border/70 bg-white p-5 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
          <Building2 className="h-5 w-5 text-brand-ink" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-brand-ink">
            {t("request_diocese_title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("request_diocese_desc")}
          </p>
        </div>
      </div>
      <SalesWhatsAppCta
        placement="billing_diocese_coverage"
        variant="inline"
        prefill={t("request_diocese_prefill", { name: parishName || "—" })}
        cta={t("request_diocese_cta")}
      />
    </section>
  );
}

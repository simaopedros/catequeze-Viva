import { Building2, ShieldCheck, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SalesWhatsAppCta } from "../../client/components/SalesWhatsAppCta";
import { cn } from "../../client/utils";

export type ManagedBillingNoticeVariant =
  | "collaborator"
  | "covered"
  | "diocese";

export type ManagedBillingNoticeProps = {
  workspaceName: string;
  roleLabel?: string;
  dioceseName?: string | null;
  managerName?: string | null;
  variant?: ManagedBillingNoticeVariant;
};

export function ManagedBillingNotice({
  workspaceName,
  roleLabel,
  dioceseName,
  managerName,
  variant = "collaborator",
}: ManagedBillingNoticeProps) {
  const { t } = useTranslation("billing");
  const namedDiocese = dioceseName?.trim() || null;
  const namedManager = managerName?.trim() || null;
  const Icon =
    variant === "diocese"
      ? Building2
      : variant === "covered"
        ? ShieldCheck
        : User;

  const headline =
    variant === "diocese"
      ? t("managed_notice.diocese_headline")
      : variant === "covered"
        ? namedDiocese
          ? t("managed_notice.covered_headline_named", { name: namedDiocese })
          : t("managed_notice.covered_headline")
        : t("managed_notice.collaborator_headline");

  const result =
    variant === "diocese"
      ? t("managed_notice.diocese_result")
      : variant === "covered"
        ? namedDiocese
          ? t("managed_notice.covered_result_named", { name: namedDiocese })
          : t("managed_notice.covered_result")
        : roleLabel
          ? t("managed_notice.collaborator_result_role", { role: roleLabel })
          : t("managed_notice.collaborator_result");

  const managerLine =
    variant === "diocese"
      ? t("managed_notice.diocese_manager")
      : namedDiocese
        ? t("managed_notice.manager_diocese", { name: namedDiocese })
        : namedManager
          ? t("managed_notice.manager_person", { name: namedManager })
          : t("managed_notice.manager_coordination", { name: workspaceName });

  return (
    <div
      className="mx-auto max-w-3xl space-y-8"
      data-testid="managed-billing-notice"
      data-variant={variant}
    >
      <section
        data-testid="managed-billing-hero"
        className="relative overflow-hidden rounded-sm border border-border/70 bg-white px-5 py-6 sm:px-8 sm:py-8"
      >
        <div className="relative z-[1] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-ink/8 text-brand-ink">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t("managed_notice.eyebrow")}
                </p>
                <p className="truncate text-sm font-semibold tracking-tight text-brand-ink sm:text-base">
                  {workspaceName}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
              <span
                className="h-1.5 w-1.5 rounded-full bg-brand-ink"
                aria-hidden
              />
              {t("managed_notice.badge")}
            </span>
          </div>

          <div className="max-w-xl space-y-2">
            <h1 className="font-sans text-title-sm font-semibold tracking-tight text-brand-ink sm:text-title-md">
              {headline}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-body">
              {result}
            </p>
          </div>
        </div>
        <ShieldCheck
          className="pointer-events-none absolute -bottom-6 -right-4 hidden h-40 w-40 text-brand-ink/10 sm:block"
          strokeWidth={1}
          aria-hidden
        />
      </section>

      <section
        data-testid="managed-billing-who"
        className="rounded-sm border border-border/70 bg-white p-5 sm:p-7"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("managed_notice.who_title")}
        </p>
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-brand-ink">
          {managerLine}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("managed_notice.who_desc")}
        </p>
        {roleLabel && variant === "collaborator" && (
          <p
            className={cn(
              "mt-4 rounded-sm border border-border/60 bg-muted/20 px-3 py-2 text-sm text-brand-ink",
            )}
          >
            {t("managed_notice.your_role", { role: roleLabel })}
          </p>
        )}
      </section>

      {variant === "diocese" && (
        <section
          data-testid="managed-billing-diocese-sales"
          className="rounded-sm border border-border/60 bg-muted/20 px-5 py-4"
        >
          <h2 className="text-sm font-semibold tracking-tight text-brand-ink">
            {t("managed_notice.diocese_sales_title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("managed_notice.diocese_sales_desc")}
          </p>
          <div className="mt-3">
            <SalesWhatsAppCta
              placement="billing_diocese_workspace"
              variant="inline"
              prefill={t("managed_notice.diocese_prefill", {
                name: workspaceName || "—",
              })}
              cta={t("managed_notice.diocese_cta")}
            />
          </div>
        </section>
      )}
    </div>
  );
}

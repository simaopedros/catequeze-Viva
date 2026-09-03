import { useTranslation } from "react-i18next";
import { cn } from "../utils";
import { trackMarketingEvent } from "../analytics/marketingAnalytics";
import {
  SALES_WHATSAPP_DISPLAY,
  getSalesWhatsAppUrl,
} from "../../shared/salesContact";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type SalesWhatsAppCtaProps = {
  placement: string;
  variant?: "card" | "inline" | "row";
  className?: string;
};

export function SalesWhatsAppCta({
  placement,
  variant = "card",
  className,
}: SalesWhatsAppCtaProps) {
  const { t } = useTranslation("public");
  const href = getSalesWhatsAppUrl(t("sales_whatsapp.prefill"));
  const ariaLabel = t("sales_whatsapp.aria");

  const onClick = () => {
    trackMarketingEvent("secondary_cta_clicked", {
      placement,
      destination: "whatsapp_sales",
      channel: "whatsapp",
    });
  };

  if (variant === "row") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          "flex items-center gap-3 text-muted-foreground transition-colors hover:text-brand-ink",
          className,
        )}
      >
        <WhatsAppIcon className="h-5 w-5 shrink-0 text-brand-ink" />
        <span>
          <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("sales_whatsapp.cta_short")}
          </span>
          <span className="text-sm text-brand-ink">
            {SALES_WHATSAPP_DISPLAY}
          </span>
        </span>
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <p
        className={cn(
          "text-sm leading-relaxed text-muted-foreground",
          className,
        )}
      >
        {t("sales_whatsapp.question")}{" "}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          aria-label={ariaLabel}
          className="inline-flex items-center gap-1.5 font-medium text-brand-ink underline underline-offset-2 hover:text-brand-ink-soft"
        >
          <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
          {t("sales_whatsapp.cta")}
        </a>
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-sm border border-border/70 bg-white px-5 py-6 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-brand-ink">
        {t("sales_whatsapp.question")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("sales_whatsapp.helper")}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        aria-label={ariaLabel}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-brand-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-ink-soft"
      >
        <WhatsAppIcon className="h-4 w-4 shrink-0" />
        {t("sales_whatsapp.cta")}
      </a>
      <p className="mt-2 text-xs text-muted-foreground">
        {SALES_WHATSAPP_DISPLAY}
      </p>
    </div>
  );
}

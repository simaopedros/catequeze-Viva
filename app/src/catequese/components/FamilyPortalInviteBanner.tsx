import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "../../client/components/ui/button";

/**
 * Visible callout pointing staff to the family portal invites hub.
 */
export function FamilyPortalInviteBanner({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { t } = useTranslation("family");

  return (
    <div
      className={
        "flex flex-col gap-3 rounded-sm border border-brand-gold/35 bg-brand-gold/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between " +
        (compact ? "p-3" : "")
      }
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-white">
          <Mail className="h-5 w-5 text-brand-ink" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-brand-ink">
            {t("portal_invites.banner_title")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {t("portal_invites.banner_desc")}
          </p>
        </div>
      </div>
      <Button asChild className="h-11 min-h-11 shrink-0 rounded-md">
        <Link to="/app/family-invites">
          {t("portal_invites.banner_cta")}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { Button } from "../../../client/components/ui/button";

export type SocialAccessReason =
  | "anonymous"
  | "subscription"
  | "quota"
  | "banned"
  | null;

/**
 * Explains why the composer is unavailable. Reading and sharing stay open, so
 * this is always an invitation rather than a blocker.
 */
export function SocialAccessNotice({ reason }: { reason: SocialAccessReason }) {
  const { t } = useTranslation("social");
  if (!reason) return null;

  const copy = {
    anonymous: {
      title: t("upsell.anonymousTitle"),
      description: t("upsell.anonymousDescription"),
      to: "/login",
      cta: t("upsell.login"),
    },
    subscription: {
      title: t("upsell.title"),
      description: t("upsell.description"),
      to: "/pricing",
      cta: t("upsell.cta"),
    },
    quota: {
      title: t("upsell.quotaTitle"),
      description: t("upsell.quotaDescription"),
      to: "/pricing",
      cta: t("upsell.cta"),
    },
    banned: {
      title: t("upsell.bannedTitle"),
      description: t("upsell.bannedDescription"),
      to: null,
      cta: null,
    },
  }[reason];

  return (
    <aside className="rounded-2xl border border-border bg-white p-4 shadow-[0_3px_16px_rgba(18,46,76,0.07)] sm:p-5">
      <div className="flex items-start gap-3">
        <Lock
          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0">
          <h2 className="font-semibold">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.description}
          </p>
          {copy.to && copy.cta && (
            <Button asChild size="sm" className="mt-3">
              <Link to={copy.to}>{copy.cta}</Link>
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}

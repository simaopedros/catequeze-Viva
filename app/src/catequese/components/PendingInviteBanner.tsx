import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight } from "lucide-react";
import { useUserContext } from "../../client/hooks/useUserContext";
import { Button } from "../../client/components/ui/button";

/**
 * Shown when the logged-in user has INVITED memberships they can accept.
 * Does not force navigation — points to /app/select-workspace where accept lives.
 */
export function PendingInviteBanner() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { hasPendingInvitations, allMemberships, isLoading } = useUserContext();

  if (isLoading) return null;
  if (
    location.pathname.startsWith("/app/select-workspace") ||
    location.pathname.startsWith("/app/onboarding") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/signup")
  ) {
    return null;
  }

  const invited = (allMemberships || []).filter((m) => m.status === "INVITED");
  if (!hasPendingInvitations && invited.length === 0) return null;

  const count = invited.length || 1;
  const firstName = invited[0]?.parishName;

  return (
    <div
      className="no-print border-b border-[#D39A2B]/40 bg-[#D39A2B]/[0.12] px-3 py-2.5 sm:px-4"
      role="status"
      data-testid="pending-invite-banner"
    >
      <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2 text-sm text-[#071A2D]">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#071A2D]" />
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">
              {count === 1
                ? t("pending_invite.banner_one", {
                    name: firstName || t("pending_invite.a_workspace"),
                  })
                : t("pending_invite.banner_many", { count })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("pending_invite.banner_hint")}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-9 shrink-0 rounded-sm shadow-none"
          asChild
        >
          <Link to="/app/select-workspace">
            {t("pending_invite.view_cta")}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

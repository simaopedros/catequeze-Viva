import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { useUserContext } from "../../../client/hooks/useUserContext";
import {
  AppEyebrow,
  AppGoldRule,
  AppPageHeader,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { Card, CardContent, CardHeader } from "../../../client/components/ui/card";
import { Button } from "../../../client/components/ui/button";
import { Church, User as UserIcon, LogOut, Shield } from "lucide-react";
import { Link } from "react-router";
import { signOut } from "../../../client/analytics/himetrica";
import { isFamilyPortalHost } from "../../../shared/portal";
import { useState } from "react";

/**
 * Portal account page — profile + parish, no billing / Stripe / AI credits.
 */
export default function PortalAccountPage() {
  const { t } = useTranslation("account");
  const { t: tn } = useTranslation("navigation");
  const { t: tt } = useTranslation("topbar");
  const { data: user } = useAuth();
  const { parishName: ctxParishName, userRole } = useUserContext();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      window.location.replace(isFamilyPortalHost() ? "/entrar" : "/login");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <AppPageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={user.email || ""}
      />

      {ctxParishName && (
        <AppPanel className="flex items-center gap-3">
          <div className="rounded-sm border border-border/70 bg-muted/30 p-2 text-[#071A2D]">
            <Church className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("linked_parish")}
            </p>
            <p
              className="font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {ctxParishName}
            </p>
            {userRole && (
              <p className="mt-0.5 text-xs text-muted-foreground">{userRole}</p>
            )}
          </div>
        </AppPanel>
      )}

      <Card className="rounded-sm border-border/70">
        <CardHeader className="space-y-1.5">
          <AppEyebrow className="flex items-center gap-2">
            <UserIcon className="h-3.5 w-3.5" />
            {t("account_info")}
          </AppEyebrow>
          <AppGoldRule className="w-8" />
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {user.email && (
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {t("email")}
                </div>
                <div className="text-sm text-[#071A2D] sm:col-span-2">
                  {user.email}
                </div>
              </div>
            </div>
          )}
          {(user.firstName || user.username) && (
            <div className="border-t border-border/70 px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {t("name", { defaultValue: "Nome" })}
                </div>
                <div className="text-sm text-[#071A2D] sm:col-span-2">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    user.username}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <Button
          asChild
          variant="outline"
          className="h-11 min-h-11 w-full justify-start rounded-sm"
        >
          <Link to="/app/consents">
            <Shield className="mr-2 h-4 w-4" />
            {tn("consents")}
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 w-full justify-start rounded-sm"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {tt("sign_out")}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("portal_sponsored_note", {
          defaultValue:
            "Acesso patrocinado pela paróquia. Não há cobrança neste portal.",
        })}
      </p>
    </div>
  );
}

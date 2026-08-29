import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import {
  AI_APP_HOME,
  AI_FEATURES_ENABLED,
  isAiAppPath,
} from "../../shared/aiFeatures";
import { PublicNavbar } from "../../catequese/PublicNavbar";
import { PublicFooter } from "../../catequese/PublicFooter";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { AppDisplayTitle, AppGoldRule } from "./brand/AppChrome";

export function NotFoundPage() {
  const { data: user } = useAuth();
  const { t } = useTranslation("common");
  const location = useLocation();

  if (!AI_FEATURES_ENABLED && isAiAppPath(location.pathname)) {
    return <Navigate to={AI_APP_HOME} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md space-y-6 text-center">
          <div className="inline-flex rounded-sm border border-border/70 bg-muted/30 p-4">
            <FileQuestion className="h-10 w-10 text-brand-ink" />
          </div>
          <div className="space-y-2.5">
            <AppDisplayTitle className="text-6xl text-brand-ink sm:text-6xl">
              404
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-lg text-muted-foreground">
              {t("not_found_desc")}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("back")}
            </Button>
            <Button asChild>
              <WaspRouterLink
                to={
                  user
                    ? routes.AppDashboardRoute.to
                    : routes.LandingPageRoute.to
                }
              >
                {t("go_home")}
              </WaspRouterLink>
            </Button>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

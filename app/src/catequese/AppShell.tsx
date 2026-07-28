import { ReactNode, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { TwoFactorGate } from "./components/TwoFactorGate";
import { SubscriptionGate } from "./components/SubscriptionGate";
import { ProductTrialBanner } from "./components/ProductTrialBanner";
import { FamilyAppShell } from "./FamilyAppShell";
import { useUserContext } from "../client/hooks/useUserContext";
import { useAuth } from "wasp/client/auth";
import { ErrorBoundary } from "../client/components/ErrorBoundary";
import { ShellBase } from "../client/components/ShellBase";
import { isFamilyPortalHost, familyPortalUrl } from "../shared/portal";
import { useAction, acceptInvitation } from "wasp/client/operations";
import { trackMarketingEvent } from "../client/analytics/marketingAnalytics";
import { toast } from "../client/hooks/use-toast";

const AIHelperWidget = lazy(() =>
  import("./components/AIHelperWidget").then((m) => ({
    default: m.AIHelperWidget,
  })),
);
const GuidedTour = lazy(() =>
  import("./components/GuidedTour").then((m) => ({ default: m.GuidedTour })),
);

import { useGuidedTour } from "./components/GuidedTour";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  // Mobile primary nav is BottomNav (+ Mais sheet). No hamburger drawer —
  // TopBar keeps context, search, notifications, and profile only.
  const {
    needsOnboarding,
    hasPendingInvitations,
    isLoading,
    isFetching,
    userRole,
    memberships,
    allMemberships,
  } = useUserContext();
  const { showTour, completeTour } = useGuidedTour();
  const acceptInvitationAction = useAction(acceptInvitation);
  const autoAcceptedRef = useRef(false);

  const isFamily = useMemo(() => isFamilyPortalHost(), []);
  const isFamilyOnlyRole = userRole === "GUARDIAN" || userRole === "CATECHUMEN";
  const hasStaffRole = isFamilyOnlyRole
    ? (allMemberships || []).some(
        (m: any) => !["GUARDIAN", "CATECHUMEN"].includes(m.role),
      )
    : true;

  // Track the auth session inside the shell so we can actively redirect when
  // it disappears instead of depending on the protected page wrapper mounting.
  const { data: authUser } = useAuth();

  const isMinimalPath = useMemo(() => {
    const path = location.pathname;
    return path === "/app/onboarding" || path === "/app/select-workspace";
  }, [location.pathname]);

  useEffect(() => {
    if (isLoading || isFetching) return;
    if (isFamilyOnlyRole && !hasStaffRole && !isFamily) {
      window.location.href = familyPortalUrl("/app");
    }
  }, [isLoading, isFetching, isFamilyOnlyRole, hasStaffRole, isFamily]);

  useEffect(() => {
    if (isLoading || isFetching) return;
    if (!isFamilyOnlyRole || hasStaffRole) return;
    if (autoAcceptedRef.current) return;
    const invited = memberships.filter((m: any) => m.status === "INVITED");
    if (invited.length === 0) return;
    autoAcceptedRef.current = true;
    Promise.all(
      invited.map((m: any) =>
        acceptInvitationAction({ membershipId: m.id })
          .then(() => {
            trackMarketingEvent("invite_accepted", {
              role: m.role,
              parish_id: m.parishId || null,
              source: "app_shell_auto_accept",
            });
          })
          .catch((e: any) => {
            toast({
              title: t("error"),
              description: e?.message || t("try_again"),
              variant: "destructive",
            });
          }),
      ),
    );
  }, [
    isLoading,
    isFetching,
    isFamilyOnlyRole,
    memberships,
    acceptInvitationAction,
    t,
  ]);

  const hasActiveMembership = useMemo(
    () => (memberships || []).some((m: any) => m.status === "ACTIVE"),
    [memberships],
  );

  useEffect(() => {
    if (isLoading || isFetching) return;
    const path = location.pathname;
    if (isFamilyOnlyRole && path === "/app/select-workspace") {
      navigate("/app");
      return;
    }
    // Only force the selector when the user has invites and NO active workspace
    // yet. If they already have personal/active membership, never trap them —
    // invites alone used to loop /app ↔ /select-workspace.
    if (
      !isFamilyOnlyRole &&
      hasPendingInvitations &&
      !hasActiveMembership &&
      !path.includes("/select-workspace") &&
      !path.includes("/onboarding")
    ) {
      navigate("/app/select-workspace");
      return;
    }
    if (
      needsOnboarding &&
      !path.includes("/onboarding") &&
      !path.includes("/select-workspace") &&
      !path.includes("/billing")
    ) {
      navigate("/app/onboarding");
    }
  }, [
    isLoading,
    isFetching,
    needsOnboarding,
    hasPendingInvitations,
    hasActiveMembership,
    isFamilyOnlyRole,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (authUser !== null) return;
    window.location.replace(isFamily ? "/entrar" : "/login");
  }, [authUser, isFamily]);
  // Prevent the stale shell from rendering while the hard redirect to the auth
  // entrypoint is in flight.
  if (authUser === null) {
    return <div className="mobile-screen-height bg-background" />;
  }

  if (isFamily) {
    return <FamilyAppShell>{children}</FamilyAppShell>;
  }

  // Keep a single TwoFactorGate instance across /app ↔ select-workspace so
  // navigation does not remount the gate and re-run getTwoFactorStatus.
  return (
    <TwoFactorGate>
      {isMinimalPath ? (
        <div className="mobile-screen-height bg-background">{children}</div>
      ) : (
        <ShellBase variant="app">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-overlay focus:rounded-sm focus:bg-brand-ink focus:px-4 focus:py-2 focus:text-white"
          >
            {t("skip_to_content")}
          </a>
          <div className="no-print hidden flex-shrink-0 lg:block">
            <Sidebar />
          </div>

          <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
            <div className="no-print">
              <ErrorBoundary
                fallback={
                  <div className="flex h-14 items-center border-b border-border/70 bg-white px-4" />
                }
              >
                <TopBar />
              </ErrorBoundary>
              <ProductTrialBanner />
            </div>
            <main
              id="main-content"
              ref={mainRef}
              className="no-overscroll scroll-touch flex-1 overflow-y-auto bg-background px-3 py-4 print:overflow-visible print:bg-white print:p-0 min-[360px]:px-4 md:p-6"
              style={{
                paddingBottom:
                  "calc(var(--height-bottom-nav, 3.5rem) + env(safe-area-inset-bottom, 0px) + 0.5rem)",
              }}
            >
              <div
                key={location.pathname}
                className="content-transition print:contents"
              >
                <SubscriptionGate>{children}</SubscriptionGate>
              </div>
            </main>
          </div>
          <div className="no-print">
            <BottomNav />
          </div>
          <div className="no-print">
            <Suspense fallback={null}>
              <AIHelperWidget />
            </Suspense>
          </div>
          {showTour && (
            <Suspense fallback={null}>
              <GuidedTour onComplete={completeTour} />
            </Suspense>
          )}
        </ShellBase>
      )}
    </TwoFactorGate>
  );
}

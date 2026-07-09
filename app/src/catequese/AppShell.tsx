import {
  ReactNode,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const handleMenuToggle = useCallback(
    () => setMobileMenuOpen((prev) => !prev),
    [],
  );
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
          .catch(() => {}),
      ),
    );
  }, [
    isLoading,
    isFetching,
    isFamilyOnlyRole,
    memberships,
    acceptInvitationAction,
  ]);

  useEffect(() => {
    if (isLoading || isFetching) return;
    const path = location.pathname;
    if (isFamilyOnlyRole && path === "/app/select-workspace") {
      navigate("/app");
      return;
    }
    if (
      !isFamilyOnlyRole &&
      hasPendingInvitations &&
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
    isFamilyOnlyRole,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    setMobileMenuOpen(false);
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (authUser !== null) return;
    window.location.replace(isFamily ? "/entrar" : "/login");
  }, [authUser, isFamily]);
  // Prevent the stale shell from rendering while the hard redirect to the auth
  // entrypoint is in flight.
  if (authUser === null) {
    return <div className="min-h-screen bg-background" />;
  }

  if (isFamily) {
    return <FamilyAppShell>{children}</FamilyAppShell>;
  }

  if (isMinimalPath) {
    return (
      <TwoFactorGate>
        <div className="min-h-screen bg-background">{children}</div>
      </TwoFactorGate>
    );
  }

  return (
    <TwoFactorGate>
      <ShellBase variant="app">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-overlay focus:px-4 focus:py-2 focus:bg-[#071A2D] focus:text-white focus:rounded-sm"
        >
          {t("skip_to_content")}
        </a>
        <div className="no-print hidden flex-shrink-0 lg:block">
          <Sidebar />
        </div>

        {mobileMenuOpen && (
          <>
            <div
              className="no-print fixed inset-0 z-modal bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <nav className="no-print fixed inset-y-0 left-0 z-[501] w-64 overflow-y-auto border-r border-border/70 bg-white lg:hidden animate-in slide-in-from-left-5 duration-200">
              <Sidebar />
            </nav>
          </>
        )}

        <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
          <div className="no-print">
            <ErrorBoundary
              fallback={
                <div className="flex h-14 items-center border-b border-border/70 bg-white px-4" />
              }
            >
              <TopBar onMenuToggle={handleMenuToggle} />
            </ErrorBoundary>
            <ProductTrialBanner />
          </div>
          <main
            id="main-content"
            ref={mainRef}
            className="no-overscroll scroll-touch flex-1 overflow-y-auto bg-background p-4 print:overflow-visible print:bg-white print:p-0 md:p-6"
            style={{
              paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div key={location.pathname} className="content-transition print:contents">
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
    </TwoFactorGate>
  );
}

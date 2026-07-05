import { ReactNode, useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { TwoFactorGate } from './components/TwoFactorGate';
import { SubscriptionGate } from './components/SubscriptionGate';
import { FamilyAppShell } from './FamilyAppShell';
import { useUserContext } from '../client/hooks/useUserContext';
import { useAuth } from 'wasp/client/auth';
import { ErrorBoundary } from '../client/components/ErrorBoundary';
import { ShellBase } from '../client/components/ShellBase';
import { isFamilyPortalHost, familyPortalUrl } from '../shared/portal';
import { useAction, acceptInvitation } from 'wasp/client/operations';
import { trackMarketingEvent } from '../client/analytics/marketingAnalytics';

const AIHelperWidget = lazy(() => import('./components/AIHelperWidget').then(m => ({ default: m.AIHelperWidget })));
const GuidedTour = lazy(() => import('./components/GuidedTour').then(m => ({ default: m.GuidedTour })));

import { useGuidedTour } from './components/GuidedTour';

interface AppShellProps { children: ReactNode; }

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const handleMenuToggle = useCallback(() => setMobileMenuOpen(prev => !prev), []);
  const { needsOnboarding, hasPendingInvitations, isLoading, isFetching, userRole, memberships, allMemberships } = useUserContext();
  const { showTour, completeTour } = useGuidedTour();
  const acceptInvitationAction = useAction(acceptInvitation);
  const autoAcceptedRef = useRef(false);

  const isFamily = useMemo(() => isFamilyPortalHost(), []);
  const isFamilyOnlyRole = userRole === 'GUARDIAN' || userRole === 'CATECHUMEN';
  const hasStaffRole = isFamilyOnlyRole
    ? (allMemberships || []).some((m: any) => !['GUARDIAN', 'CATECHUMEN'].includes(m.role))
    : true;

  // Auth guard: if the session is gone (e.g. right after logout), we render
  // nothing (see the early return after all hooks below). The Wasp router
  // then redirects to /login, preventing the app shell from briefly rendering
  // the dashboard with stale cached data.
  const { data: authUser } = useAuth();

  const isMinimalPath = useMemo(() => {
    const path = location.pathname;
    return path === '/app/onboarding' || path === '/app/select-workspace';
  }, [location.pathname]);

  useEffect(() => {
    if (isLoading || isFetching) return;
    if (isFamilyOnlyRole && !hasStaffRole && !isFamily) {
      window.location.href = familyPortalUrl('/app');
    }
  }, [isLoading, isFetching, isFamilyOnlyRole, hasStaffRole, isFamily]);

  useEffect(() => {
    if (isLoading || isFetching) return;
    if (!isFamilyOnlyRole || hasStaffRole) return;
    if (autoAcceptedRef.current) return;
    const invited = memberships.filter((m: any) => m.status === 'INVITED');
    if (invited.length === 0) return;
    autoAcceptedRef.current = true;
    Promise.all(
      invited.map((m: any) =>
        acceptInvitationAction({ membershipId: m.id })
          .then(() => {
            trackMarketingEvent('invite_accepted', {
              role: m.role,
              parish_id: m.parishId || null,
              source: 'app_shell_auto_accept',
            });
          })
          .catch(() => {}),
      ),
    );
  }, [isLoading, isFetching, isFamilyOnlyRole, memberships, acceptInvitationAction]);

  useEffect(() => {
    if (isLoading || isFetching) return;
    const path = location.pathname;
    if (isFamilyOnlyRole && path === '/app/select-workspace') {
      navigate('/app');
      return;
    }
    if (!isFamilyOnlyRole && hasPendingInvitations && !path.includes('/select-workspace') && !path.includes('/onboarding')) {
      navigate('/app/select-workspace');
      return;
    }
    if (needsOnboarding && !path.includes('/onboarding') && !path.includes('/select-workspace') && !path.includes('/billing')) {
      navigate('/app/onboarding');
    }
  }, [isLoading, isFetching, needsOnboarding, hasPendingInvitations, isFamilyOnlyRole, location.pathname, navigate]);

  useEffect(() => {
    setMobileMenuOpen(false);
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  // Auth guard: render nothing when the session is gone (e.g. right after
  // logout). The Wasp router redirects to /login; this prevents the app shell
  // from briefly rendering the dashboard with stale cached data. Placed after
  // all hooks to respect the rules of hooks.
  if (authUser === null) {
    return null;
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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-overlay focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
          {t('skip_to_content')}
        </a>
        <div className="hidden lg:block flex-shrink-0"><Sidebar /></div>

        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-modal bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <nav className="fixed inset-y-0 left-0 z-[501] w-64 bg-card shadow-elevation-lg overflow-y-auto lg:hidden animate-in slide-in-from-left-5 duration-200">
              <Sidebar />
            </nav>
          </>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          <ErrorBoundary fallback={<div className="flex h-14 items-center border-b bg-card shadow-elevation-sticky px-4" />}>
            <TopBar onMenuToggle={handleMenuToggle} />
          </ErrorBoundary>
          <main id="main-content" ref={mainRef} className="flex-1 overflow-y-auto bg-background p-4 md:p-6 no-overscroll scroll-touch" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
            <div key={location.pathname} className="content-transition"><SubscriptionGate>{children}</SubscriptionGate></div>
          </main>
        </div>
        <BottomNav />
        <Suspense fallback={null}>
          <AIHelperWidget />
        </Suspense>
        {showTour && (
          <Suspense fallback={null}>
            <GuidedTour onComplete={completeTour} />
          </Suspense>
        )}
      </ShellBase>
    </TwoFactorGate>
  );
}
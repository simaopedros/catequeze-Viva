import { ReactNode, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { AIHelperWidget } from './components/AIHelperWidget';
import { Breadcrumbs } from './components/Breadcrumbs';
import { GuidedTour, useGuidedTour } from './components/GuidedTour';
import { TwoFactorGate } from './components/TwoFactorGate';
import { FamilyAppShell } from './FamilyAppShell';
import { useUserContext } from '../client/hooks/useUserContext';
import { ErrorBoundary } from '../client/components/ErrorBoundary';
import { isFamilyPortalHost, familyPortalUrl } from '../shared/portal';
import { useAction, acceptInvitation } from 'wasp/client/operations';

interface AppShellProps { children: ReactNode; }

export function AppShell({ children }: AppShellProps) {
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

  // User is "family-only" if ALL their roles across ALL workspaces are GUARDIAN or CATECHUMEN.
  // A user who is ALSO a catechist/coordinator keeps full access to the staff portal.
  const isFamilyOnlyRole = userRole === 'GUARDIAN' || userRole === 'CATECHUMEN';
  const hasStaffRole = isFamilyOnlyRole
    ? (allMemberships || []).some((m: any) => !['GUARDIAN', 'CATECHUMEN'].includes(m.role))
    : true;

  // GUARDIAN/CATECHUMEN on staff host → redirect to family portal (only if no staff role)
  useEffect(() => {
    if (isLoading || isFetching) return;
    if (isFamilyOnlyRole && !hasStaffRole && !isFamily) {
      window.location.href = familyPortalUrl('/app');
    }
  }, [isLoading, isFetching, isFamilyOnlyRole, hasStaffRole, isFamily]);

  // Auto-accept INVITED memberships for GUARDIAN/CATECHUMEN (only if no staff role)
  useEffect(() => {
    if (isLoading || isFetching) return;
    if (!isFamilyOnlyRole || hasStaffRole) return;
    if (autoAcceptedRef.current) return;
    const invited = memberships.filter((m: any) => m.status === 'INVITED');
    if (invited.length === 0) return;
    autoAcceptedRef.current = true;
    Promise.all(invited.map((m: any) => acceptInvitationAction({ membershipId: m.id }).catch(() => {})));
  }, [isLoading, isFetching, isFamilyOnlyRole, memberships, acceptInvitationAction]);

  // Redirecionar para onboarding ou workspace selector conforme necessário
  useEffect(() => {
    if (isLoading || isFetching) return;
    const path = location.pathname;
    // GUARDIAN/CATECHUMEN: skip workspace selector, go directly to dashboard
    if (isFamilyOnlyRole && path === '/app/select-workspace') {
      navigate('/app');
      return;
    }
    // Users with pending invitations go to workspace selector, not onboarding
    // (except family-only roles who don't need workspace selection)
    if (!isFamilyOnlyRole && hasPendingInvitations && !path.includes('/select-workspace') && !path.includes('/onboarding')) {
      navigate('/app/select-workspace');
      return;
    }
    if (needsOnboarding && !path.includes('/onboarding') && !path.includes('/select-workspace') && !path.includes('/billing')) {
      navigate('/app/onboarding');
    }
  }, [isLoading, isFetching, needsOnboarding, hasPendingInvitations, isFamilyOnlyRole, location.pathname, navigate]);

  // Fechar menu mobile ao navegar + reset scroll
  useEffect(() => {
    setMobileMenuOpen(false);
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  // Family portal gets a simplified shell
  if (isFamily) {
    return <FamilyAppShell>{children}</FamilyAppShell>;
  }

  return (
    <TwoFactorGate>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block"><Sidebar /></div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 h-full w-64 animate-in slide-in-from-left-5 duration-200">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <ErrorBoundary fallback={<div className="flex h-14 items-center border-b bg-card px-4" />}>
          <TopBar onMenuToggle={handleMenuToggle} />
        </ErrorBoundary>
        <Breadcrumbs />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6 pb-16 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
      <AIHelperWidget />
      {showTour && <GuidedTour onComplete={completeTour} />}
    </div>
    </TwoFactorGate>
  );
}

import { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { AIHelperWidget } from './components/AIHelperWidget';
import { Breadcrumbs } from './components/Breadcrumbs';
import { GuidedTour, useGuidedTour } from './components/GuidedTour';
import { TwoFactorGate } from './components/TwoFactorGate';
import { useUserContext } from '../client/hooks/useUserContext';

interface AppShellProps { children: ReactNode; }

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { needsOnboarding, isLoading, isFetching } = useUserContext();
  const { showTour, completeTour } = useGuidedTour();

  // Redirecionar para onboarding se necessário (aguarda dados frescos para evitar loop)
  useEffect(() => {
    if (!isLoading && !isFetching && needsOnboarding && !location.pathname.includes('/onboarding') && !location.pathname.includes('/select-workspace')) {
      navigate('/app/onboarding');
    }
  }, [isLoading, isFetching, needsOnboarding, location.pathname, navigate]);

  // Fechar menu mobile ao navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
        <TopBar onMenuToggle={() => setMobileMenuOpen(prev => !prev)} />
        <Breadcrumbs />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-16 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
      <AIHelperWidget />
      {showTour && <GuidedTour onComplete={completeTour} />}
    </div>
    </TwoFactorGate>
  );
}

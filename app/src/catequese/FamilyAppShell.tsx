import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'wasp/client/auth';
import { UserDropdown } from '../user/UserDropdown';
import { TwoFactorGate } from './components/TwoFactorGate';
import { Home, Calendar, MessageSquare } from 'lucide-react';
import { BrandLockup } from '../client/components/brand/Brand';

interface FamilyAppShellProps { children: ReactNode; }

/**
 * Simplified app shell for the family portal (guardians & catechumens).
 * No sidebar, no admin links, no billing — just the essentials.
 */
export function FamilyAppShell({ children }: FamilyAppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useAuth();
  const { t } = useTranslation('navigation');

  const navItems = [
    { to: '/app', icon: Home, label: t('dashboard') },
    { to: '/app/calendar', icon: Calendar, label: t('calendar') },
    { to: '/app/messages', icon: MessageSquare, label: t('messages') },
  ];

  return (
    <TwoFactorGate>
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-sticky border-b bg-background shadow-elevation-sticky" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BrandLockup compact hideBadge />
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {t('family_label')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user && <UserDropdown user={user} />}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 bg-background p-4 md:p-6 no-overscroll scroll-touch" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-sticky border-t bg-background shadow-elevation-sticky md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around" style={{ height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/app' && location.pathname.startsWith(item.to));
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
     isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
    }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-overline font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
    </TwoFactorGate>
  );
}

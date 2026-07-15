import { ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { signOut } from '../client/analytics/himetrica';
import { Link as WaspRouterLink } from 'wasp/client/router';
import { type User as UserEntity } from 'wasp/entities';
import { userMenuItems } from './constants';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';
import DarkModeSwitcher from '../client/components/DarkModeSwitcher';
import { useTranslation } from 'react-i18next';
import { isFamilyPortalHost } from '../shared/portal';
import { Link } from 'react-router';

export type UserDropdownVariant = 'default' | 'portal';

/**
 * Top-bar user menu.
 * - default: pastoral items (dashboard, commercial /account, admin)
 * - portal: family shell only — /app/account (no billing), language, theme, sign-out
 *
 * Also forces portal mode when host is familia.* so commercial AccountRoute is never linked.
 */
export function UserDropdown({
  user,
  variant,
}: {
  user: Partial<UserEntity>;
  variant?: UserDropdownVariant;
}) {
  const { t } = useTranslation('topbar');
  const { t: tn } = useTranslation('navigation');
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Family portal host or explicit portal variant: never link commercial /account
  const isPortal = variant === 'portal' || isFamilyPortalHost();

  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : (user.email || user.username || t('current_user'));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('[data-radix-popper-content-wrapper], [data-slot="dropdown-menu-content"]')) {
        return;
      }

      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setOpen(false);
    try {
      await signOut();
    } finally {
      window.location.replace(isFamilyPortalHost() || isPortal ? '/entrar' : '/login');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-foreground hover:text-[#071A2D] flex items-center h-11 min-h-11 w-11 lg:w-auto justify-center lg:justify-start transition-colors duration-300 ease-in-out rounded-sm lg:rounded-none hover:bg-accent/50 lg:hover:bg-transparent"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="mr-2 hidden text-right text-sm font-semibold tracking-tight text-[#071A2D] lg:block"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {displayName}
        </span>
        <User className="size-5 shrink-0" />
        <ChevronDown className="size-4 hidden lg:block shrink-0" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-sm border border-border/70 bg-white p-1"
          role="menu"
        >
          {isPortal ? (
            <Link
              to="/app/account"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-[#071A2D] hover:bg-muted/40 hover:text-[#0a2540]"
              role="menuitem"
            >
              <Settings size="1.1rem" />
              {tn('account', { defaultValue: t('account_settings') })}
            </Link>
          ) : (
            userMenuItems.map((item) => {
              if (item.isAuthRequired && !user) return null;
              if (item.isAdminOnly && (!user || !user.isAdmin)) return null;
              return (
                <WaspRouterLink
                  key={item.labelKey}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-[#071A2D] hover:bg-muted/40 hover:text-[#0a2540]"
                >
                  <item.icon size="1.1rem" />
                  {t(item.labelKey)}
                </WaspRouterLink>
              );
            })
          )}
          <div className="border-t my-1" />
          <div className="flex min-h-11 items-center justify-between px-2 py-1.5">
            <span className="text-xs text-muted-foreground">{t('language')}</span>
            <LanguageSwitcher variant="inline" />
          </div>
          <div className="flex min-h-11 items-center justify-between px-2 py-1.5">
            <span className="text-xs text-muted-foreground">{t('theme')}</span>
            <DarkModeSwitcher />
          </div>
          <div className="border-t my-1" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-[#071A2D] hover:bg-muted/40 hover:text-[#0a2540]"
            role="menuitem"
          >
            <LogOut size="1.1rem" />
            {t('sign_out')}
          </button>
        </div>
      )}
    </div>
  );
}

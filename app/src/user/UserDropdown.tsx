import { ChevronDown, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { signOut } from '../client/analytics/himetrica';
import { Link as WaspRouterLink } from 'wasp/client/router';
import { type User as UserEntity } from 'wasp/entities';
import { userMenuItems } from './constants';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';
import DarkModeSwitcher from '../client/components/DarkModeSwitcher';
import { useTranslation } from 'react-i18next';
import { isFamilyPortalHost } from '../shared/portal';

export function UserDropdown({ user }: { user: Partial<UserEntity> }) {
  const { t } = useTranslation('topbar');
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      window.location.replace(isFamilyPortalHost() ? '/entrar' : '/login');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-foreground hover:text-primary flex items-center h-9 w-9 lg:w-auto justify-center lg:justify-start transition-colors duration-300 ease-in-out rounded-sm lg:rounded-none hover:bg-accent/50 lg:hover:bg-transparent"
      >
        <span className="text-foreground mr-2 hidden text-right text-sm font-medium lg:block">
          {displayName}
        </span>
        <User className="size-5 shrink-0" />
        <ChevronDown className="size-4 hidden lg:block shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-md border bg-popover p-1 shadow-md z-50">
          {userMenuItems.map((item) => {
            if (item.isAuthRequired && !user) return null;
            if (item.isAdminOnly && (!user || !user.isAdmin)) return null;
            return (
              <WaspRouterLink
                key={item.labelKey}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon size="1.1rem" />
                {t(item.labelKey)}
              </WaspRouterLink>
            );
          })}
          <div className="border-t my-1" />
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs text-muted-foreground">{t('language')}</span>
            <LanguageSwitcher variant="inline" />
          </div>
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs text-muted-foreground">{t('theme')}</span>
            <DarkModeSwitcher />
          </div>
          <div className="border-t my-1" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut size="1.1rem" />
            {t('sign_out')}
          </button>
        </div>
      )}
    </div>
  );
}
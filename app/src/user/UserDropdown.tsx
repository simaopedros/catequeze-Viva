import { ChevronDown, LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { signOut } from "../client/analytics/himetrica";
import { Link as WaspRouterLink } from "wasp/client/router";
import { type User as UserEntity } from "wasp/entities";
import { userMenuItems } from "./constants";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import DarkModeSwitcher from "../client/components/DarkModeSwitcher";
import { useTranslation } from "react-i18next";

export function UserDropdown({ user }: { user: Partial<UserEntity> }) {
  const { t } = useTranslation('topbar');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : (user.email || user.username || 'Usuário');

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out"
      >
        <span className="text-foreground mr-2 hidden text-right text-sm font-medium lg:block">
          {displayName}
        </span>
        <User className="size-5" />
        <ChevronDown className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-md border bg-popover p-1 shadow-md z-50">
          {userMenuItems.map((item) => {
            if (item.isAuthRequired && !user) return null;
            if (item.isAdminOnly && (!user || !user.isAdmin)) return null;
            return (
              <WaspRouterLink
                key={item.name}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon size="1.1rem" />
                {item.name}
              </WaspRouterLink>
            );
          })}
          <div className="border-t my-1" />
          {/* Language and theme inline in the user menu */}
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
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut size="1.1rem" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

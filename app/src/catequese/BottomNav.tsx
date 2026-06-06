import { useState } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Users, GraduationCap, Calendar, Settings, Heart, Menu } from 'lucide-react';
import { cn } from '../client/utils';
import { useUserContext } from '../client/hooks/useUserContext';
import { ALL_NAV_ITEMS, filterByRole, BOTTOM_NAV_KEYS, type NavItemConfig } from '../shared/navigation';
import { BottomSheetNav } from './components/BottomSheetNav';

// Icon map matching bottom nav keys
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  classes: Users,
  catechumens: GraduationCap,
  calendar: Calendar,
  settings: Settings,
  families: Heart,
};

export function BottomNav() {
  const { t } = useTranslation('navigation');
  const { userRole, isAdmin } = useUserContext();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Build items matching BOTTOM_NAV_KEYS order, filtered by role
  const filtered: (NavItemConfig & { Icon: React.ComponentType<{ className?: string }> })[] = [];
  for (const key of BOTTOM_NAV_KEYS) {
    const item = ALL_NAV_ITEMS.find(i => i.iconKey === key);
    if (item) {
      const Icon = ICON_MAP[key];
      if (Icon && (isAdmin || (userRole && item.roles.includes(userRole)))) {
        filtered.push({ ...item, Icon });
      }
    }
  }
  const visible = filtered.slice(0, 5);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="grid h-14 items-center" style={{ gridTemplateColumns: `repeat(${visible.length + 1}, 1fr)` }}>
          {visible.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.Icon className="h-5 w-5" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span>Mais</span>
          </button>
        </div>
      </nav>
      <BottomSheetNav open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

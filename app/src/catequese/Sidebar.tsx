import { NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { cn } from '../client/utils';
import {
  LayoutDashboard, Users, GraduationCap, Heart, Library, Puzzle,
  Calendar, Cross, MessageSquareText, BarChart3, Settings, CreditCard,
  ChevronLeft, ChevronRight, ChevronDown, Church, Building2, FileText,
  BookMarked, ScrollText, FolderOpen, FileCheck, CalendarRange, Shield,
  Sparkles,
} from 'lucide-react';
import { useUserContext } from '../client/hooks/useUserContext';
import { NAV_SECTIONS, filterByRole, type NavItemConfig } from '../shared/navigation';
import { useQuery, listConversations } from 'wasp/client/operations';

// ---- Icon Map (iconKey → Lucide component) ----
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  parishes: Church,
  communities: Building2,
  classes: Users,
  catechumens: GraduationCap,
  families: Heart,
  content_library: Library,
  ai_planner: Sparkles,
  activities: Puzzle,
  calendar: Calendar,
  bible: BookMarked,
  directory: FolderOpen,
  catechism: ScrollText,
  messages: MessageSquareText,
  sacraments: Cross,
  documents: FileText,
  reports: BarChart3,
  settings: Settings,
  billing: CreditCard,
  consents: FileCheck,
  catechetical_years: CalendarRange,
  admin: Shield,
};

// ---- Section label keys for collapse state initialization ----
const ALL_SECTIONS = ['people', 'pedagogy', 'pastoral'];

interface NavItemProps {
  item: NavItemConfig;
  collapsed: boolean;
}

function NavItemLink({ item, collapsed, badge }: NavItemProps & { badge?: number }) {
  const { t } = useTranslation('navigation');
  const Icon = ICON_MAP[item.iconKey];

  return (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) => cn(
        'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full relative',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
        {!collapsed && <span>{t(item.labelKey)}</span>}
      </div>
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="h-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1 animate-in zoom-in-50">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { t } = useTranslation('navigation');
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(ALL_SECTIONS)
  );
  const { userRole, isAdmin } = useUserContext();

  // Fetch unread count for messages
  const { data: conversations } = useQuery(listConversations, undefined, {
    enabled: !!userRole || isAdmin,
    refetchInterval: 15000,
  });

  const unreadMessagesCount = conversations?.reduce((acc: number, conv: any) => acc + (conv.unreadCount || 0), 0) || 0;

  const mainSections = NAV_SECTIONS.filter(s => s.section !== 'bottom');
  const bottomSection = NAV_SECTIONS.find(s => s.section === 'bottom');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <aside className={cn('flex flex-col border-r bg-card transition-all duration-200 h-full', collapsed ? 'w-16' : 'w-60')}>
      <div className="flex h-14 items-center border-b px-3">
        {!collapsed && <span className="text-lg font-semibold tracking-tight text-primary">Catequese Viva</span>}
        {collapsed && <Cross className="mx-auto h-6 w-6 text-primary" />}
      </div>

      <nav
        className="flex-1 overflow-y-auto py-4
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15
          [&::-webkit-scrollbar-thumb]:rounded-full
          hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--muted-foreground) / 0.15) transparent' }}
      >
        {mainSections.map((section) => {
          const filtered = filterByRole(section.items, userRole, isAdmin);
          if (filtered.length === 0) return null;
          const isExpanded = expandedSections.has(section.section);

          return (
            <div key={section.section} className="mt-2 first:mt-0 px-3">
              {/* Section header — clickable when not collapsed */}
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(section.section)}
                  className="flex w-full items-center justify-between mb-1 px-3 py-1 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider select-none">
                    {t(`${section.section}Section`)}
                  </p>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200',
                      !isExpanded && '-rotate-90'
                    )}
                  />
                </button>
              ) : (
                <div className="mb-1" />
              )}

              {/* Items — in collapsed mode always visible; otherwise toggled by section */}
              {(collapsed || isExpanded) && (
                <div
                  className={cn(
                    'space-y-1 overflow-hidden transition-all duration-200',
                    collapsed ? 'px-2' : 'px-2',
                    !collapsed && !isExpanded && 'max-h-0 opacity-0',
                    !collapsed && isExpanded && 'max-h-96 opacity-100',
                    collapsed && 'max-h-96 opacity-100'
                  )}
                >
                  {filtered.map((item) => (
                    <NavItemLink
                      key={item.to}
                      item={item}
                      collapsed={collapsed}
                      badge={item.iconKey === 'messages' ? unreadMessagesCount : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-2 space-y-1">
        {filterByRole(bottomSection?.items || [], userRole, isAdmin).map((item) => (
          <NavItemLink
            key={item.to}
            item={item}
            collapsed={collapsed}
            badge={item.iconKey === 'messages' ? unreadMessagesCount : undefined}
          />
        ))}
        <button onClick={() => setCollapsed(!collapsed)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
          {collapsed ? <ChevronRight className="h-5 w-5 mx-auto" /> : <><ChevronLeft className="h-5 w-5" /><span>Recolher</span></>}
        </button>
      </div>
    </aside>
  );
}

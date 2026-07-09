import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { cn } from '../client/utils';
import {
  LayoutDashboard, Users, GraduationCap, Heart, Library, Puzzle,
  Calendar, Cross, MessageSquareText, BarChart3, Settings, CreditCard,
  ChevronLeft, ChevronRight, ChevronDown, Church, Building2, FileText,
  BookMarked, ScrollText, FolderOpen, FileCheck, CalendarRange, Shield,
  Sparkles, ClipboardList,
} from 'lucide-react';
import { useUserContext } from '../client/hooks/useUserContext';
import { NAV_SECTIONS, filterByRole, type NavItemConfig } from '../shared/navigation';
import { useQuery, getUnreadMessagesCount } from 'wasp/client/operations';
import { useActiveWorkspace } from '../client/hooks/useActiveWorkspace';
import { usePageVisibility } from '../client/hooks/usePageVisibility';
import { BrandLockup, BrandMark } from '../client/components/brand/Brand';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../client/components/ui/tooltip';

// ---- Icon Map (iconKey → Lucide component) ----
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  parishes: Church,
  communities: Building2,
  classes: Users,
  catechumens: GraduationCap,
  families: Heart,
  content_library: Library,
  ai_hub: Sparkles,
  activities: Puzzle,
  calendar: Calendar,
  bible: BookMarked,
  directory: FolderOpen,
  catechism: ScrollText,
  messages: MessageSquareText,
  sacraments: Cross,
  journey_templates: ClipboardList,
  documents: FileText,
  reports: BarChart3,
  settings: Settings,
  billing: CreditCard,
  consents: FileCheck,
  catechetical_years: CalendarRange,
  admin: Shield,
};

// ---- Section label keys for collapse state initialization ----
const ALL_SECTIONS = ['more'];

interface NavItemProps {
  item: NavItemConfig;
  collapsed: boolean;
}

function NavItemLink({ item, collapsed, badge }: NavItemProps & { badge?: number }) {
  const { t } = useTranslation('navigation');
  const Icon = ICON_MAP[item.iconKey];

  // Map iconKey to data-tour attributes for the guided tour
  const tourMap: Record<string, string> = {
    classes: 'sidebar-classes',
    ai_hub: 'sidebar-ai',
    messages: 'sidebar-messages',
  };

  const link = (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/app'}
      prefetch="intent"
      data-tour={tourMap[item.iconKey] || undefined}
      className={({ isActive }) => cn(
        'relative flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-sm font-medium transition-colors duration-150',
        isActive
          ? 'bg-[#071A2D]/[0.06] text-[#071A2D] border-l-2 border-[#D39A2B]'
          : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        collapsed && 'justify-center px-2',
        'motion-reduce:transition-none'
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
        {!collapsed && <span>{t(item.labelKey)}</span>}
      </div>
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="h-4.5 min-w-[18px] flex items-center justify-center rounded-sm bg-[#071A2D] text-white text-overline font-semibold px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {link}
          </TooltipTrigger>
          <TooltipContent side="right">
            <span>{t(item.labelKey)}</span>
            {badge !== undefined && badge > 0 && (
              <span className="ml-1.5 opacity-70">({badge > 99 ? '99+' : badge})</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return link;
}

export function Sidebar() {
  const { t } = useTranslation('navigation');
  const { t: tc } = useTranslation('common');
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(ALL_SECTIONS)
  );
  const { userRole, isAdmin } = useUserContext();
  const { isPersonal } = useActiveWorkspace();
  const isVisible = usePageVisibility();

  // Fetch unread count for messages — lightweight count query instead of full conversation list
  const { data: unreadMessages } = useQuery(getUnreadMessagesCount, undefined, {
    enabled: (!!userRole || isAdmin) && isVisible,
    refetchInterval: isVisible ? 120000 : false,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const unreadMessagesCount = unreadMessages?.count || 0;

  const mainSections = NAV_SECTIONS.filter(s => s.section !== 'bottom');
  const bottomSection = NAV_SECTIONS.find(s => s.section === 'bottom');

  // Items only available in institutional parishes
  const institutionalOnlyItems = [
    'parishes', 'communities', 'reports', 'admin', 'catechetical_years', 'consents',
  ];

  const filterForWorkspace = (items: NavItemConfig[]) => {
    if (!isPersonal) return items;
    return items.filter(item => !institutionalOnlyItems.includes(item.iconKey));
  };

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
    <aside
      className={cn(
        'flex h-full flex-col border-r border-[#071A2D]/10 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex h-14 items-center border-b border-[#071A2D]/08 px-3">
        {!collapsed && <BrandLockup compact hideBadge className="max-w-full" />}
        {collapsed && <BrandMark className="mx-auto h-8 w-8" />}
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto py-4">
        {mainSections.map((section) => {
          const isPrimary = section.section === 'primary';
          const isMore = section.section === 'more';
          let filtered = filterByRole(section.items, userRole, isAdmin);
          filtered = filterForWorkspace(filtered);

          if (filtered.length === 0) return null;

          // Primary section: items always visible, no collapsible header
          if (isPrimary) {
            return (
              <div key={section.section} className="space-y-0.5 px-2.5">
                {filtered.map((item) => (
                  <NavItemLink
                    key={item.to}
                    item={item}
                    collapsed={collapsed}
                    badge={item.iconKey === 'messages' ? unreadMessagesCount : undefined}
                  />
                ))}
                <div className="my-3 border-t border-[#071A2D]/08" />
              </div>
            );
          }

          // More section: collapsible with header
          const isExpanded = expandedSections.has(section.section);
          return (
            <div key={section.section} className="mt-2 first:mt-0 px-3">
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(section.section)}
                  className="flex w-full items-center justify-between mb-0.5 px-2.5 py-1 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <p className="text-overline font-bold text-text-tertiary uppercase select-none">
                    {t('moreSection')}
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
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-2 space-y-1">
        {filterForWorkspace(filterByRole(bottomSection?.items || [], userRole, isAdmin))
          .map((item) => (
          <NavItemLink
            key={item.to}
            item={item}
            collapsed={collapsed}
            badge={item.iconKey === 'messages' ? unreadMessagesCount : undefined}
          />
        ))}
        <button onClick={() => setCollapsed(!collapsed)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent" aria-label={collapsed ? tc('expand_menu') : tc('collapse_menu')}>
          {collapsed ? <ChevronRight className="h-5 w-5 mx-auto" /> : <><ChevronLeft className="h-5 w-5" /><span>{tc('collapse')}</span></>}
        </button>
      </div>
    </aside>
  );
}


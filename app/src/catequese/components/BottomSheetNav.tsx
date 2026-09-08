import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "../../client/utils";
import {
  LayoutDashboard,
  Users,
  BookMarked,
  MessageSquareText,
  Calendar,
  Feather,
  Church,
  Building2,
  Heart,
  FolderOpen,
  ScrollText,
  Cross,
  ClipboardList,
  FileText,
  BarChart3,
  Settings,
  CreditCard,
  FileCheck,
  CalendarRange,
  Shield,
  Circle,
  GraduationCap,
  Mail,
  User,
  Landmark,
  Megaphone,
} from "lucide-react";
import { getVisibleNavigation } from "../../shared/navigation";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../client/components/ui/sheet";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  classes: Users,
  catechumens: GraduationCap,
  content_library: BookMarked,
  calendar: Calendar,
  ai_hub: Feather,
  bible: BookMarked,
  parishes: Church,
  communities: Building2,
  families: Heart,
  team: Users,
  family_portal_invites: Mail,
  directory: FolderOpen,
  catechism: ScrollText,
  sacraments: Cross,
  journey_templates: ClipboardList,
  documents: FileText,
  reports: BarChart3,
  settings: Settings,
  billing: CreditCard,
  messages: MessageSquareText,
  consents: FileCheck,
  catechetical_years: CalendarRange,
  admin: Shield,
  official_library: Landmark,
  announcements: Megaphone,
  formation: GraduationCap,
};

interface BottomSheetNavProps {
  /** Close the parent Sheet after navigating (Radix restores focus to trigger). */
  onNavigate?: () => void;
}

/**
 * Mobile "More" navigation sheet content.
 * Grouped by task (Operação, Pessoas, Conteúdo, Gestão, Configurações).
 * Visibility comes from getVisibleNavigation (SSOT with sidebar / bottom bar).
 */
export function BottomSheetNav({ onNavigate }: BottomSheetNavProps) {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("common");
  const { userRole, isAdmin } = useUserContext();
  const { workspaceType } = useActiveWorkspace();

  const { sheetGroups } = getVisibleNavigation({
    role: userRole,
    isAdmin,
    workspaceType,
  });

  return (
    <SheetContent
      id="bottom-sheet-nav"
      side="bottom"
      className="z-50 max-h-[70vh] gap-0 overflow-y-auto rounded-t-sm border-t border-border/70 bg-surface-elevated p-0 lg:hidden"
    >
      <SheetHeader className="sticky top-0 z-10 space-y-0 border-b border-border/70 bg-surface-elevated px-4 pb-3 pt-4 text-left">
        <div className="mb-2 flex justify-center" aria-hidden>
          <div className="h-1 w-10 rounded-sm bg-muted-foreground/30" />
        </div>
        <SheetTitle className="pr-8 text-base">{t("moreSection")}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 p-4">
        {sheetGroups.map((group) => (
          <div key={group.id}>
            <p className="mb-2 px-1 text-[11px] font-medium tracking-wide text-muted-foreground/70">
              {t(group.labelKey)}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.iconKey] ?? Circle;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/app"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-11 items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "border-l-2 border-brand-gold bg-muted/40 font-semibold text-brand-ink"
                          : "text-muted-foreground hover:bg-accent hover:text-brand-ink",
                      )
                    }
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
        <div className="border-t border-border/70 pt-3">
          <NavLink
            to="/account"
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <User className="h-5 w-5 shrink-0" aria-hidden />
            <span>{tc("account", { defaultValue: "Conta" })}</span>
          </NavLink>
        </div>
      </div>
    </SheetContent>
  );
}

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
} from "lucide-react";
import {
  getVisibleNavigation,
  type NavItemConfig,
} from "../../shared/navigation";
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
};

interface BottomSheetNavProps {
  /** Close the parent Sheet after navigating (Radix restores focus to trigger). */
  onNavigate?: () => void;
}

function groupSheetItems(items: NavItemConfig[]) {
  const primaryKeys = new Set([
    "dashboard",
    "classes",
    "catechumens",
    "content_library",
    "ai_hub",
    "calendar",
    "bible",
    "messages",
  ]);
  const bottomKeys = new Set([
    "settings",
    "billing",
    "consents",
    "catechetical_years",
    "admin",
  ]);

  const primary: NavItemConfig[] = [];
  const more: NavItemConfig[] = [];
  const bottom: NavItemConfig[] = [];

  for (const item of items) {
    if (primaryKeys.has(item.iconKey)) primary.push(item);
    else if (bottomKeys.has(item.iconKey)) bottom.push(item);
    else more.push(item);
  }

  return [
    { key: "primary", items: primary },
    { key: "more", items: more },
    { key: "bottom", items: bottom },
  ].filter((g) => g.items.length > 0);
}

/**
 * Mobile "More" navigation sheet content.
 * Parent must wrap with `<Sheet>` + `SheetTrigger` so Radix provides focus trap,
 * Escape, overlay dismiss, initial focus on close, and focus restore.
 * Visibility comes from getVisibleNavigation (SSOT with sidebar / bottom bar).
 */
export function BottomSheetNav({ onNavigate }: BottomSheetNavProps) {
  const { t } = useTranslation("navigation");
  const { userRole, isAdmin } = useUserContext();
  const { workspaceType } = useActiveWorkspace();

  const { sheetItems } = getVisibleNavigation({
    role: userRole,
    isAdmin,
    workspaceType,
  });

  const groups = groupSheetItems(sheetItems);

  return (
    <SheetContent
      id="bottom-sheet-nav"
      side="bottom"
      className="z-50 max-h-[70vh] gap-0 overflow-y-auto rounded-t-sm border-t border-border/70 bg-white p-0 lg:hidden"
    >
      <SheetHeader className="sticky top-0 z-10 space-y-0 border-b border-border/70 bg-white px-4 pb-3 pt-4 text-left">
        <div className="mb-2 flex justify-center" aria-hidden>
          <div className="h-1 w-10 rounded-sm bg-muted-foreground/30" />
        </div>
        <SheetTitle className="pr-8 text-base">{t("moreSection")}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 p-4">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
              {group.key === "primary"
                ? t("primarySection")
                : t("moreSection")}
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
                          ? "border-l-2 border-[#D39A2B] bg-muted/40 font-semibold text-[#071A2D]"
                          : "text-muted-foreground hover:bg-accent hover:text-[#071A2D]",
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
      </div>
    </SheetContent>
  );
}

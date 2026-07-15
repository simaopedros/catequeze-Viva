import { useState } from "react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  Menu,
} from "lucide-react";
import { cn } from "../client/utils";
import { useUserContext } from "../client/hooks/useUserContext";
import { useActiveWorkspace } from "../client/hooks/useActiveWorkspace";
import { useUnreadNotificationCount } from "../client/hooks/useUnreadNotificationCount";
import { getVisibleNavigation } from "../shared/navigation";
import { BottomSheetNav } from "./components/BottomSheetNav";
import { Sheet, SheetTrigger } from "../client/components/ui/sheet";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  classes: Users,
  catechumens: GraduationCap,
  calendar: Calendar,
};

export function BottomNav() {
  const { t } = useTranslation("navigation");
  const { userRole, isAdmin } = useUserContext();
  const { workspaceType } = useActiveWorkspace();
  const [sheetOpen, setSheetOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();

  const { bottomBar } = getVisibleNavigation({
    role: userRole,
    isAdmin,
    workspaceType,
  });

  const visible = bottomBar
    .map((item) => {
      const Icon = ICON_MAP[item.iconKey];
      return Icon ? { ...item, Icon } : null;
    })
    .filter(Boolean) as Array<
    (typeof bottomBar)[number] & {
      Icon: React.ComponentType<{ className?: string }>;
    }
  >;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-sticky border-t border-border/70 bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={t("primarySection", { defaultValue: "Primary" })}
      >
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: `repeat(${visible.length + 1}, 1fr)`,
            height: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {visible.map((item) => {
            const label = t(item.labelKey);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                prefetch="intent"
                title={label}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 px-0.5 text-overline font-medium transition-colors",
                    isActive
                      ? "text-[#071A2D]"
                      : "text-muted-foreground hover:text-[#071A2D]",
                  )
                }
              >
                <item.Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate">{label}</span>
              </NavLink>
            );
          })}
          <SheetTrigger asChild>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-controls="bottom-sheet-nav"
              className="relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-overline font-medium text-muted-foreground transition-colors hover:text-[#071A2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Menu className="h-5 w-5" />
              <span>{t("more", { ns: "common" })}</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 right-1/4 flex h-[18px] min-w-[18px] items-center justify-center rounded-sm bg-destructive px-1 text-overline font-semibold text-destructive-foreground ">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </SheetTrigger>
        </div>
      </nav>
      <BottomSheetNav onNavigate={() => setSheetOpen(false)} />
    </Sheet>
  );
}

import { useState } from "react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  Settings,
  Heart,
  Menu,
  Bell,
} from "lucide-react";
import { cn } from "../client/utils";
import { useUserContext } from "../client/hooks/useUserContext";
import { useUnreadNotificationCount } from "../client/hooks/useUnreadNotificationCount";
import {
  ALL_NAV_ITEMS,
  filterByRole,
  BOTTOM_NAV_KEYS,
  type NavItemConfig,
} from "../shared/navigation";
import { BottomSheetNav } from "./components/BottomSheetNav";

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
  const { t } = useTranslation("navigation");
  const { userRole, isAdmin } = useUserContext();
  const [sheetOpen, setSheetOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();

  // Build items matching BOTTOM_NAV_KEYS order, filtered by role
  const filtered: (NavItemConfig & {
    Icon: React.ComponentType<{ className?: string }>;
  })[] = [];
  for (const key of BOTTOM_NAV_KEYS) {
    const item = ALL_NAV_ITEMS.find((i) => i.iconKey === key);
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
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-sticky border-t border-border/70 bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: `repeat(${visible.length + 1}, 1fr)`,
            height: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              prefetch="intent"
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full text-overline font-medium transition-colors",
                  isActive
                    ? "text-[#071A2D]"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <item.Icon className="h-5 w-5" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setSheetOpen(true)}
            className="relative flex flex-col items-center justify-center gap-0.5 h-full text-overline font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span>{t("more", { ns: "common" })}</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 right-1/4 flex h-[18px] min-w-[18px] items-center justify-center rounded-sm bg-destructive px-1 text-overline font-semibold text-destructive-foreground ">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </nav>
      <BottomSheetNav open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

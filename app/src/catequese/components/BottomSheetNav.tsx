import { useState } from "react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "../../client/utils";
import {
  X,
  ChevronUp,
  LayoutDashboard,
  Users,
  BookMarked,
  MessageSquareText,
  Calendar,
} from "lucide-react";
import { NAV_SECTIONS, filterByRole } from "../../shared/navigation";
import { useUserContext } from "../../client/hooks/useUserContext";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  classes: Users,
  catechumens: Users,
  content_library: BookMarked,
  calendar: Calendar,
  messages: MessageSquareText,
};

interface BottomSheetNavProps {
  open: boolean;
  onClose: () => void;
}

export function BottomSheetNav({ open, onClose }: BottomSheetNavProps) {
  const { t } = useTranslation("navigation");
  const { userRole, isAdmin } = useUserContext();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 lg:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-sm border-t border-border/70 bg-white transition-transform duration-300 lg:hidden">
        {/* Handle */}
        <div className="sticky top-0 border-b border-border/70 bg-white pt-3 pb-2 flex justify-center border-b">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="p-4 space-y-4">
          {NAV_SECTIONS.filter((s) => s.section !== "bottom").map((section) => {
            const filtered = filterByRole(section.items, userRole, isAdmin);
            if (filtered.length === 0) return null;

            return (
              <div key={section.section}>
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  {t(`${section.section}Section`)}
                </p>
                <div className="space-y-1">
                  {filtered.map((item) => {
                    const Icon = ICON_MAP[item.iconKey];
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/app"}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-muted/40 text-foreground border-l-2 border-[#D39A2B]"
                              : "text-muted-foreground hover:bg-accent",
                          )
                        }
                      >
                        {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                        <span>{t(item.labelKey)}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

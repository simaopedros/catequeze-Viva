import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { UserDropdown } from "../user/UserDropdown";
import { TwoFactorGate } from "./components/TwoFactorGate";
import { Home, Calendar, MessageSquare } from "lucide-react";
import { BrandLockup } from "../client/components/brand/Brand";

interface FamilyAppShellProps {
  children: ReactNode;
}

/**
 * Simplified app shell for the family portal (guardians & catechumens).
 * No sidebar, no admin links, no billing — just the essentials.
 */
export function FamilyAppShell({ children }: FamilyAppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useAuth();
  const { t } = useTranslation("navigation");

  const navItems = [
    { to: "/app", icon: Home, label: t("dashboard") },
    { to: "/app/calendar", icon: Calendar, label: t("calendar") },
    { to: "/app/messages", icon: MessageSquare, label: t("messages") },
  ];

  return (
    <TwoFactorGate>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Top bar */}
        <header
          className="sticky top-0 z-sticky border-b border-border/70 bg-white"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <BrandLockup compact hideBadge />
              <span className="text-[11px] px-2 py-0.5 rounded-sm border border-border/70 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-[0.12em]">
                {t("family_label")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {user && <UserDropdown user={user} />}
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className="no-overscroll scroll-touch flex-1 bg-background p-4 md:p-6"
          style={{
            paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </main>

        {/* Bottom nav (mobile) */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-sticky border-t border-border/70 bg-white md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div
            className="flex items-center justify-around"
            style={{ height: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.to ||
                (item.to !== "/app" && location.pathname.startsWith(item.to));
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-sm transition-colors ${
                    isActive
                      ? "text-[#071A2D]"
                      : "text-muted-foreground hover:text-[#071A2D]"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span
                    className={`text-overline font-medium ${isActive ? "text-[#071A2D]" : ""}`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </TwoFactorGate>
  );
}

import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { UserDropdown } from "../user/UserDropdown";
import { TwoFactorGate } from "./components/TwoFactorGate";
import { Home, Calendar, MessageSquare, Sparkles } from "lucide-react";
import { BrandLockup } from "../client/components/brand/Brand";
import { SOCIAL_FEATURES_ENABLED } from "../shared/socialFeatures";
import { isFamilyPortalPath } from "../shared/familyPortal";

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

  useEffect(() => {
    if (!isFamilyPortalPath(location.pathname)) {
      navigate("/app", { replace: true });
    }
  }, [location.pathname, navigate]);

  const navItems = [
    { to: "/app", icon: Home, label: t("dashboard") },
    ...(SOCIAL_FEATURES_ENABLED
      ? [
          {
            to: "/app/comunidade",
            icon: Sparkles,
            label: t("community_short"),
          },
        ]
      : []),
    { to: "/app/calendar", icon: Calendar, label: t("calendar") },
    { to: "/app/messages", icon: MessageSquare, label: t("messages") },
  ];

  return (
    <TwoFactorGate>
      <div className="mobile-screen-height flex flex-col bg-background">
        {/* Top bar */}
        <header
          className="sticky top-0 z-sticky border-b border-border/70 bg-white"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex h-14 items-center justify-between gap-2 px-3 min-[360px]:px-4">
            <div className="flex min-w-0 items-center gap-2 min-[360px]:gap-3">
              <BrandLockup compact hideBadge />
              <span className="hidden rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground min-[360px]:inline-flex">
                {t("family_label")}
              </span>
            </div>
            <nav
              className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
              aria-label={t("primarySection", { defaultValue: "Principal" })}
            >
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== "/app" && location.pathname.startsWith(item.to));
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => navigate(item.to)}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-brand-ink/8 text-brand-ink"
                        : "text-muted-foreground hover:text-brand-ink"
                    }`}
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="flex items-center gap-2">
              {user && <UserDropdown user={user} />}
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className="no-overscroll scroll-touch flex-1 bg-background px-3 py-4 min-[360px]:px-4 md:p-6"
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
            style={{ height: "var(--height-bottom-nav, 3.5rem)" }}
          >
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.to ||
                (item.to !== "/app" && location.pathname.startsWith(item.to));
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-full min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-sm px-1 transition-colors ${
                    isActive
                      ? "text-brand-ink"
                      : "text-muted-foreground hover:text-brand-ink"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span
                    className={`text-overline font-medium ${
                      isActive ? "text-brand-ink" : ""
                    }`}
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

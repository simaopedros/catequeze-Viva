import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { UserDropdown } from "../user/UserDropdown";
import { TwoFactorGate } from "./components/TwoFactorGate";
import {
  Home,
  Calendar,
  MessageSquare,
  Menu,
  FileText,
  Shield,
  Route,
  User,
  LogOut,
} from "lucide-react";
import { BrandLockup } from "../client/components/brand/Brand";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../client/components/ui/sheet";
import { signOut } from "../client/analytics/himetrica";
import { isFamilyPortalHost } from "../shared/portal";
import { cn } from "../client/utils";

interface FamilyAppShellProps {
  children: ReactNode;
}

const FAMILY_ROUTE_PREFIXES = [
  "/app/messages",
  "/app/meetings/",
  "/app/dependents/",
  "/app/documents",
  "/app/consents",
  "/app/my-journey",
  "/app/account",
];

function isFamilyRoute(path: string): boolean {
  if (path === "/app" || path === "/app/calendar") return true;
  return FAMILY_ROUTE_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/") || path.startsWith(p),
  );
}

/**
 * Simplified app shell for the family portal (guardians & catechumens).
 * No sidebar, no admin links, no billing — just the essentials.
 * Bottom nav: Início · Agenda · Mensagens · Mais (docs, consents, journey, account, logout).
 */
export function FamilyAppShell({ children }: FamilyAppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useAuth();
  const { t } = useTranslation("navigation");
  const { t: tt } = useTranslation("topbar");
  const [moreOpen, setMoreOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isFamilyRoute(location.pathname)) {
      navigate("/app", { replace: true });
    }
  }, [location.pathname, navigate]);

  const navItems = [
    { to: "/app", icon: Home, label: t("dashboard") },
    { to: "/app/calendar", icon: Calendar, label: t("calendar") },
    { to: "/app/messages", icon: MessageSquare, label: t("messages") },
  ];

  const moreItems = [
    { to: "/app/documents", icon: FileText, label: t("documents") },
    { to: "/app/consents", icon: Shield, label: t("consents") },
    {
      to: "/app/my-journey",
      icon: Route,
      label: t("my_journey", { defaultValue: "Jornada" }),
    },
    {
      to: "/app/account",
      icon: User,
      label: t("account", { defaultValue: "Conta" }),
    },
  ];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setMoreOpen(false);
    try {
      await signOut();
    } finally {
      window.location.replace(isFamilyPortalHost() ? "/entrar" : "/login");
    }
  };

  const go = (to: string) => {
    setMoreOpen(false);
    navigate(to);
  };

  const moreActive = moreItems.some(
    (item) =>
      location.pathname === item.to || location.pathname.startsWith(item.to + "/"),
  );

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

        {/* Bottom nav (mobile) + Mais sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <nav
            className="fixed bottom-0 left-0 right-0 z-sticky border-t border-border/70 bg-white md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            aria-label={t("primarySection", { defaultValue: "Principal" })}
          >
            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: "repeat(4, 1fr)",
                height: "calc(4rem + env(safe-area-inset-bottom, 0px))",
              }}
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
                    className={cn(
                      "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-overline font-medium transition-colors",
                      isActive
                        ? "text-[#071A2D]"
                        : "text-muted-foreground hover:text-[#071A2D]",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className={isActive ? "text-[#071A2D]" : ""}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-overline font-medium transition-colors",
                    moreActive || moreOpen
                      ? "text-[#071A2D]"
                      : "text-muted-foreground hover:text-[#071A2D]",
                  )}
                  aria-label={t("moreSection")}
                >
                  <Menu className="h-5 w-5" />
                  <span>{t("moreSection")}</span>
                </button>
              </SheetTrigger>
            </div>
          </nav>

          <SheetContent side="bottom" className="rounded-t-lg pb-safe">
            <SheetHeader className="text-left">
              <SheetTitle
                className="text-base font-semibold tracking-tight text-[#071A2D]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                {t("moreSection")}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-1">
              {moreItems.map((item) => {
                const active =
                  location.pathname === item.to ||
                  location.pathname.startsWith(item.to + "/");
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => go(item.to)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-muted/50 text-[#071A2D]"
                        : "text-[#071A2D] hover:bg-muted/40",
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
              <div className="my-2 border-t border-border/70" />
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex min-h-11 items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-[#071A2D] hover:bg-muted/40"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {tt("sign_out")}
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop quick links (md+) */}
        <div className="hidden border-t border-border/70 bg-white md:block">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 px-4 py-3">
            {[...navItems, ...moreItems].map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border/70 px-3 py-2 text-sm font-medium text-[#071A2D] hover:bg-muted/40"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </TwoFactorGate>
  );
}

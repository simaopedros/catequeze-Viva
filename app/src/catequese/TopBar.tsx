import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useQuery, globalSearch } from "wasp/client/operations";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "wasp/client/operations";
import {
  Search,
  Bell,
  Menu,
  X,
  Loader2,
  Users,
  GraduationCap,
  ScrollText,
  BookMarked,
  FileText,
  Library,
  FolderOpen,
  MessageSquareText,
  CalendarDays,
  Home,
  Church,
  Building2,
  Shield,
  Clock,
} from "lucide-react";
import { useAuth } from "wasp/client/auth";
import { UserDropdown } from "../user/UserDropdown";
import { useUnreadNotificationCount } from "../client/hooks/useUnreadNotificationCount";
import { formatRelativeTime } from "../i18n/format";
import { useLocale } from "../i18n/useLocale";
import { Button } from "../client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../client/components/ui/dropdown-menu";
import { cn } from "../client/utils";
import { ContextSelector } from "./components/ContextSelector";
import { SearchSheet } from "./components/SearchSheet";
import {
  isOnProductTrial,
  getProductTrialDaysLeft,
  isOnInstitutionalTrial,
  getInstitutionalTrialDaysLeft,
} from "../shared/pricing";
import { useActiveWorkspace } from "../client/hooks/useActiveWorkspace";
import { Link } from "react-router";

const MODULE_ICONS: Record<string, React.ComponentType<any>> = {
  catechumen: Users,
  class: GraduationCap,
  content: Library,
  bible: BookMarked,
  catechism: ScrollText,
  directory: FolderOpen,
  family: Home,
  sacrament: Church,
  document: FileText,
  parish: Church,
  community: Building2,
};

const NOTIF_ICONS: Record<string, React.ComponentType<any>> = {
  MESSAGE: MessageSquareText,
  CAMPAIGN: Bell,
  ATTENDANCE: CalendarDays,
  DOCUMENT: FileText,
  SACRAMENT: Shield,
  SYSTEM: Bell,
};

interface TopBarProps {
  onMenuToggle?: () => void;
}

export const TopBar = memo(function TopBar({ onMenuToggle }: TopBarProps) {
  const { t } = useTranslation("common");
  const { t: tTop } = useTranslation("topbar");
  const { t: tNav } = useTranslation("navigation");
  const { t: tBilling } = useTranslation("billing");
  const { currentLocale } = useLocale();
  const { data: user } = useAuth();
  const { isPersonal, workspace } = useActiveWorkspace();
  const navigate = useNavigate();

  const personalTrial = isPersonal && isOnProductTrial(user);
  const instBilling =
    !isPersonal && workspace?.billingStatus
      ? {
          plan: workspace.plan || "SINGLE",
          status: workspace.billingStatus,
          trialEndsAt:
            (workspace as { trialEndsAt?: string | Date | null }).trialEndsAt ??
            null,
        }
      : null;
  const institutionalTrial = Boolean(
    instBilling && isOnInstitutionalTrial(instBilling),
  );
  const onTrial = personalTrial || institutionalTrial;
  const trialDaysLeft = personalTrial
    ? getProductTrialDaysLeft(user)
    : getInstitutionalTrialDaysLeft(instBilling);

  // Search state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Notifications
  const unreadCount = useUnreadNotificationCount();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setNotifsLoading(true);
    try {
      const result = await listNotifications({ take: 10 });
      setNotifs(result.notifications || []);
    } catch {
      setNotifs([]);
    } finally {
      setNotifsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (notifOpen) loadNotifications();
  }, [notifOpen, loadNotifications]);

  const handleNotifClick = async (notif: any) => {
    if (!notif.readAt) {
      try {
        await markNotificationRead({ notificationId: notif.id });
      } catch {}
    }
    if (notif.link) navigate(notif.link);
    setNotifOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifs((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
      );
    } catch {}
  };

  // Debounce query (600ms — reduces DB hits during fast typing)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 600);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useQuery(
    globalSearch,
    { query: debouncedQuery, locale: currentLocale },
    { enabled: debouncedQuery.length >= 3, refetchOnWindowFocus: false },
  );

  // Group results by module
  const grouped = results.reduce<Record<string, any[]>>((acc, r: any) => {
    if (!acc[r.module]) acc[r.module] = [];
    acc[r.module].push(r);
    return acc;
  }, {});

  const moduleNames = Object.keys(grouped);
  const flatResults = moduleNames.flatMap((m) => grouped[m]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
        setSelectedIndex(0);
        if (searchExpanded) setSearchExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchExpanded]);

  // Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = useCallback(
    (route: string) => {
      setFocused(false);
      setQuery("");
      setSelectedIndex(0);
      setSearchSheetOpen(false);
      setSearchExpanded(false);
      navigate(route);
    },
    [navigate],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focused || flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex].route);
    }
  };

  const showDropdown = focused && debouncedQuery.length >= 3;

  const getModuleLabel = (module: string) => {
    return tNav(`search_module.${module}`, { defaultValue: module });
  };

  // Auto-focus input when search expands on mobile
  useEffect(() => {
    if (searchExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [searchExpanded]);

  return (
    <header
      className="flex items-center gap-2 sm:gap-3 border-b border-border/70 bg-white px-3 sm:px-4 lg:px-5"
      style={{
        height: "calc(3.5rem + env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* Mobile menu toggle — hidden when search expanded */}
      {!searchExpanded && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onMenuToggle}
          aria-label={tTop("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Search — icon-only on mobile, expands on tap */}
      <div
        ref={containerRef}
        className={`relative min-w-0 flex-1 ${
          !searchExpanded ? "sm:max-w-lg" : ""
        }`}
      >
        {/* Mobile collapsed: icon button opens search sheet */}
        {!searchExpanded && (
          <div className="flex justify-center sm:justify-start">
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden h-9 w-9 rounded-sm hover:bg-accent/50 shrink-0"
              onClick={() => setSearchSheetOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Expanded: full input (always on desktop, conditionally on mobile) */}
        <div
          className={`flex h-9 items-center gap-2 rounded-sm border border-input bg-background px-3 transition-colors focus-within:border-[#071A2D]/50 focus-within:ring-1 focus-within:ring-[#071A2D]/20 ${
            searchExpanded ? "flex" : "hidden sm:flex"
          }`}
        >
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setTimeout(() => {
                setFocused(false);
                if (!query) setSearchExpanded(false);
              }, 150);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchExpanded(false);
                setQuery("");
              }
              handleKeyDown(e);
            }}
            placeholder={tTop("searchPlaceholder")}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-text-tertiary"
            data-tour="ctrlk"
          />
          {isLoading && debouncedQuery.length >= 3 && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          )}
          {!isLoading && query && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-[#071A2D] shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {/* Close button on mobile when expanded */}
          {searchExpanded && (
            <button
              onClick={() => {
                setSearchExpanded(false);
                setQuery("");
              }}
              className="sm:hidden text-muted-foreground hover:text-[#071A2D] shrink-0 ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {showDropdown && (
          <div className="absolute top-full mt-1 left-0 right-0 z-50 overflow-hidden rounded-sm border border-border/70 bg-white">
            {flatResults.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Search className="mx-auto h-5 w-5 text-text-tertiary mb-1" />
                <p className="text-sm text-muted-foreground">
                  {t("no_results")}
                </p>
              </div>
            ) : (
              <div className="max-h-48 sm:max-h-72 overflow-y-auto">
                {moduleNames.map((module) => {
                  const Icon = MODULE_ICONS[module] || Search;
                  return (
                    <div key={module}>
                      <div className="flex items-center gap-2 border-y border-border/70 bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {getModuleLabel(module)}
                      </div>
                      {grouped[module].map((item: any) => {
                        const globalIdx = flatResults.indexOf(item);
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelect(item.route);
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors ${
                              isSelected ? "bg-accent" : "hover:bg-muted/50"
                            }`}
                          >
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-sm font-semibold tracking-tight text-[#071A2D]"
                                style={{
                                  fontFamily: "var(--font-brand-display)",
                                }}
                              >
                                {item.label}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Footer */}
            <div className="flex items-center gap-3 px-3 py-1.5 border-t text-overline text-text-tertiary">
              <span>
                <kbd className="rounded border px-1 py-0.5 text-overline font-mono">
                  ↑↓
                </kbd>{" "}
                {tTop("searchNavigate")}
              </span>
              <span>
                <kbd className="rounded border px-1 py-0.5 text-overline font-mono">
                  ↵
                </kbd>{" "}
                {tTop("searchOpen")}
              </span>
              <span className="ml-auto">{tTop("searchFocusHint")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right section — hidden when search expanded on mobile */}
      {!searchExpanded && (
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">
          {onTrial && (
            <Link
              to="/app/billing"
              className="hidden items-center gap-1.5 rounded-sm border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071A2D] transition-colors hover:bg-muted/50 sm:inline-flex"
              title={tBilling("trial_status_title")}
            >
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              {trialDaysLeft === 1
                ? tBilling("trial_topbar_one")
                : tBilling("trial_topbar_other", { count: trialDaysLeft ?? 0 })}
            </Link>
          )}
          {/* Unified context selector: workspace + role */}
          <ContextSelector />

          {/* Notifications with real data */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-sm hover:bg-accent/50"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-sm bg-destructive px-1 text-overline font-semibold text-destructive-foreground ">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-xs font-semibold text-muted-foreground">
                  {tTop("notifications")}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-overline text-[#071A2D] hover:underline"
                  >
                    {tTop("markAllRead")}
                  </button>
                )}
              </div>
              {notifsLoading ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("loading")}
                </div>
              ) : notifs.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  <Bell className="mx-auto h-6 w-6 mb-2 opacity-40" />
                  {tTop("noNotifications")}
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y">
                  {notifs.map((n: any) => {
                    const NIcon = NOTIF_ICONS[n.type] || Bell;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={cn(
                          "w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                          !n.readAt && "bg-muted/30",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm",
                            !n.readAt
                              ? "bg-[#071A2D] text-white"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <NIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "truncate text-xs tracking-tight",
                              !n.readAt
                                ? "font-semibold text-[#071A2D]"
                                : "font-medium text-[#071A2D]/80",
                            )}
                            style={{ fontFamily: "var(--font-brand-display)" }}
                          >
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-overline text-muted-foreground truncate">
                              {n.body}
                            </p>
                          )}
                          <p className="text-overline text-text-tertiary mt-0.5">
                            {formatRelativeTime(n.createdAt, currentLocale)}
                          </p>
                        </div>
                        {!n.readAt && (
                          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-[#D39A2B]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User dropdown — contains lang, theme, profile links, logout */}
          {user && <UserDropdown user={user} />}
        </div>
      )}

      {/* Mobile search sheet */}
      <SearchSheet
        open={searchSheetOpen}
        onClose={() => setSearchSheetOpen(false)}
        query={query}
        onQueryChange={(q) => {
          setQuery(q);
          setSelectedIndex(0);
        }}
        results={debouncedQuery.length >= 3 ? results || [] : []}
        isLoading={isLoading}
        onSelect={handleSelect}
        currentLocale={currentLocale}
      />
    </header>
  );
});

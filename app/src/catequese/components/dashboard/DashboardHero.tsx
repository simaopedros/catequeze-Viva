import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { Calendar, Plus, Search, UserPlus } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { AppDisplayTitle } from "../../../client/components/brand/AppChrome";
import { usePageTitle } from "../../../client/hooks/usePageTitle";
import { openGlobalSearch } from "../../../client/utils/globalSearchEvent";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { cn } from "../../../client/utils";

export function getGreetingKey(
  hour: number,
): "greeting_morning" | "greeting_afternoon" | "greeting_evening" {
  if (hour < 12) return "greeting_morning";
  if (hour < 18) return "greeting_afternoon";
  return "greeting_evening";
}

interface DashboardHeroProps {
  /** Hide creation CTAs (e.g. while the activation checklist already drives them). */
  hideActions?: boolean;
  now?: Date;
  className?: string;
}

export function DashboardHero({
  hideActions = false,
  now = new Date(),
  className,
}: DashboardHeroProps) {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation("common");
  const { t: tTop } = useTranslation("topbar");
  const { currentLocale } = useLocale();
  const { data: user } = useAuth();

  usePageTitle(t("title"));

  const firstName = user?.firstName?.trim() || user?.username?.trim() || null;
  const greeting = t(getGreetingKey(now.getHours()), {
    name: firstName ?? "",
    context: firstName ? undefined : "anonymous",
  });
  const fullDate = formatDate(now, currentLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-5 sm:pb-6 lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <AppDisplayTitle className="text-title-md sm:text-title-lg">
          {greeting}
          <span aria-hidden className="ml-2">
            👋
          </span>
        </AppDisplayTitle>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-body">
          {t("hero_subtitle")}
        </p>
        <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          <span className="first-letter:uppercase">{fullDate}</span>
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:shrink-0">
        <button
          type="button"
          onClick={openGlobalSearch}
          className="group flex h-11 min-h-11 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-sm text-muted-foreground shadow-elevation-xs transition-colors hover:border-input hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-56"
          aria-label={tTop("searchPlaceholder")}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1 truncate">{t("search_placeholder")}</span>
          <kbd className="hidden rounded-sm border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            Ctrl K
          </kbd>
        </button>

        {!hideActions && (
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="h-11 min-h-11 flex-1 rounded-md sm:flex-none"
            >
              <Link to="/app/catechumens/new">
                <UserPlus aria-hidden />
                {tc("create_catechumen")}
              </Link>
            </Button>
            <Button
              asChild
              className="h-11 min-h-11 flex-1 rounded-md sm:flex-none"
            >
              <Link to="/app/classes/new">
                <Plus aria-hidden />
                {t("create_class")}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

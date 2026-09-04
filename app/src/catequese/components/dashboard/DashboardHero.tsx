import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { Calendar, Plus, UserPlus } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { AppDisplayTitle } from "../../../client/components/brand/AppChrome";
import { usePageTitle } from "../../../client/hooks/usePageTitle";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { cn } from "../../../client/utils";
import { getUserDisplayFirstName } from "../../../shared/displayName";

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
  const { currentLocale } = useLocale();
  const { data: user } = useAuth();

  usePageTitle(t("title"));

  const firstName = getUserDisplayFirstName(user);
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
        "flex flex-col gap-3 border-b border-border pb-4 sm:gap-4 sm:pb-6 lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5 sm:space-y-2">
        {/* Mobile: date as eyebrow saves a line below the title */}
        <p className="text-overline font-semibold uppercase text-muted-foreground first-letter:uppercase sm:hidden">
          {fullDate}
        </p>
        <AppDisplayTitle className="text-title-sm sm:text-title-lg">
          {greeting}
          <span aria-hidden className="ml-2">
            👋
          </span>
        </AppDisplayTitle>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-body">
          {t("hero_subtitle")}
        </p>
        <p className="hidden items-center gap-1.5 pt-1 text-xs font-medium text-muted-foreground sm:flex">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          <span className="first-letter:uppercase">{fullDate}</span>
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:shrink-0">
        {!hideActions && (
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="h-10 min-h-10 flex-1 rounded-md px-3 text-xs sm:h-11 sm:min-h-11 sm:flex-none sm:px-4 sm:text-sm"
            >
              <Link to="/app/catechumens/new">
                <UserPlus aria-hidden />
                {tc("create_catechumen")}
              </Link>
            </Button>
            <Button
              asChild
              className="h-10 min-h-10 flex-1 rounded-md px-3 text-xs sm:h-11 sm:min-h-11 sm:flex-none sm:px-4 sm:text-sm"
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

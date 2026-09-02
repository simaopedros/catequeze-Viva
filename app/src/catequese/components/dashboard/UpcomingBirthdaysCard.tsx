import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Gift } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import {
  AppEyebrow,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { cn } from "../../../client/utils";
import { formatDateOnly } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { useBirthdayDistanceLabel } from "./NextActionsPanel";

export type UpcomingBirthday = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date | string;
  daysUntil: number;
  className?: string | null;
};

function initials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

interface UpcomingBirthdaysCardProps {
  birthdays: UpcomingBirthday[];
  className?: string;
}

export function UpcomingBirthdaysCard({
  birthdays,
  className,
}: UpcomingBirthdaysCardProps) {
  const { t } = useTranslation("dashboard");
  const { currentLocale } = useLocale();
  const distance = useBirthdayDistanceLabel();
  const [next, ...rest] = birthdays;

  return (
    <AppPanel
      density="compact"
      className={cn("flex flex-col gap-4", className)}
      data-testid="dashboard-birthdays"
    >
      <div className="flex items-center justify-between gap-3">
        <AppEyebrow className="inline-flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5 text-brand-gold-muted" aria-hidden />
          {t("upcoming_birthdays")}
        </AppEyebrow>
        <Link
          to="/app/birthdays"
          className="text-xs font-medium text-brand-ink underline-offset-4 hover:underline"
        >
          {t("see_all")}
        </Link>
      </div>

      {!next ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("no_upcoming_birthdays")}
        </p>
      ) : (
        <>
          <Link
            to={`/app/catechumens/${next.id}`}
            className="flex items-center gap-3 rounded-lg border border-brand-gold/25 bg-brand-gold/8 p-3 transition-colors hover:bg-brand-gold/12"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-ink text-sm font-semibold text-white"
              aria-hidden
            >
              {initials(next.firstName, next.lastName)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                <span className="font-semibold tabular-nums text-brand-ink">
                  {formatDateOnly(next.birthDate, currentLocale, {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
                {" · "}
                {distance(next.daysUntil)}
              </p>
              <p className="truncate text-base font-semibold tracking-tight text-brand-ink">
                {next.firstName} {next.lastName}
              </p>
              {next.className && (
                <p className="truncate text-xs text-muted-foreground">
                  {next.className}
                </p>
              )}
            </div>
          </Link>

          {rest.length > 0 && (
            <ul className="divide-y divide-border/60 text-sm">
              {rest.slice(0, 2).map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/app/catechumens/${b.id}`}
                    className="flex min-h-10 items-center justify-between gap-3 py-2 hover:text-brand-ink-soft"
                  >
                    <span className="truncate font-medium text-brand-ink">
                      {b.firstName} {b.lastName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateOnly(b.birthDate, currentLocale, {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                      {" · "}
                      {distance(b.daysUntil)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("birthday_hint")}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-auto h-10 min-h-10 rounded-md sm:self-start"
          >
            <Link to="/app/birthdays">
              {t("see_birthdays")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </>
      )}
    </AppPanel>
  );
}

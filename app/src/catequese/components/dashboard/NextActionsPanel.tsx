import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Church,
  ClipboardCheck,
  Gift,
  MapPin,
  Play,
  TrendingDown,
  Users,
} from "lucide-react";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import {
  AppEyebrow,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { cn } from "../../../client/utils";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import type {
  NextAction,
  NextActionId,
  NextActionPriority,
} from "../../../shared/dashboardActions";

const ICONS: Record<NextActionId, LucideIcon> = {
  prepare_meeting: Calendar,
  start_meeting: Play,
  continue_attendance: ClipboardCheck,
  complete_meeting: CheckCircle2,
  register_attendance: Users,
  low_frequency: TrendingDown,
  birthday: Gift,
  pending_sacraments: Church,
};

type Tone = {
  badge: "destructive" | "warning" | "info" | "success";
  icon: string;
};

const TONES: Record<NextActionPriority, Tone> = {
  high: { badge: "destructive", icon: "bg-destructive/10 text-destructive" },
  important: {
    badge: "warning",
    icon: "bg-brand-gold/12 text-brand-gold-muted",
  },
  attention: {
    badge: "warning",
    icon: "bg-brand-gold/12 text-brand-gold-muted",
  },
  info: { badge: "info", icon: "bg-info/10 text-info" },
};

const MEETING_ACTIONS = new Set<NextActionId>([
  "prepare_meeting",
  "start_meeting",
  "continue_attendance",
  "complete_meeting",
  "register_attendance",
]);

export function useBirthdayDistanceLabel() {
  const { t } = useTranslation("dashboard");
  return (daysUntil: number) => {
    if (daysUntil <= 0) return t("birthday_today");
    if (daysUntil === 1) return t("birthday_tomorrow");
    return t("in_days", { count: daysUntil });
  };
}

function NextActionCard({ action: a }: { action: NextAction }) {
  const { t } = useTranslation("dashboard");
  const { currentLocale } = useLocale();
  const birthdayLabel = useBirthdayDistanceLabel();
  const Icon = ICONS[a.id];
  const tone = TONES[a.priority];
  const isMeeting = MEETING_ACTIONS.has(a.id);

  const dateLabel =
    isMeeting && a.meta.date
      ? formatDate(String(a.meta.date), currentLocale, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <article className="flex h-full min-w-0 flex-col gap-3 rounded-lg border border-border/70 bg-surface-elevated p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            tone.icon,
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <Badge variant={tone.badge} size="sm">
            {t(`priority.${a.priority}`)}
          </Badge>
          <h3 className="text-base font-semibold tracking-tight text-brand-ink">
            {t(a.titleKey)}
          </h3>
          <p className="truncate text-sm font-medium text-brand-ink/80">
            {t(`action.${a.id}.subtitle`, a.meta)}
          </p>
        </div>
      </div>

      {(dateLabel || a.meta.location || a.id === "birthday") && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {dateLabel && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              <span className="first-letter:uppercase">{dateLabel}</span>
            </span>
          )}
          {a.meta.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {a.meta.location}
            </span>
          ) : null}
          {a.id === "birthday" && (
            <span className="inline-flex items-center gap-1">
              <Gift className="h-3.5 w-3.5" aria-hidden />
              {birthdayLabel(Number(a.meta.daysUntil))}
              {a.meta.className ? ` · ${a.meta.className}` : ""}
            </span>
          )}
        </div>
      )}

      <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
        {t(a.contextKey, a.meta)}
      </p>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-10 min-h-10 w-full justify-between rounded-md sm:w-auto sm:self-start"
      >
        <Link to={a.href}>
          {t(a.ctaKey)}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </article>
  );
}

function AllClearBanner({
  facts,
}: {
  facts: { label: string; value: string | number }[];
}) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-success/20 bg-success/5 p-3.5 sm:gap-4 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success sm:h-10 sm:w-10"
          aria-hidden
        >
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-brand-ink sm:text-base">
            {t("status.ok")}
          </p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {t("status.ok_desc")}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-success/15 rounded-md bg-white/60 py-2 text-center lg:flex lg:divide-x-0 lg:bg-transparent lg:py-0 lg:text-left lg:gap-6">
        {facts.map((f) => (
          <div key={f.label} className="min-w-0 px-2 lg:px-0">
            <dd className="text-sm font-semibold tabular-nums text-brand-ink sm:text-base">
              {f.value}
            </dd>
            <dt className="text-[11px] leading-tight text-muted-foreground sm:text-xs">
              {f.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface NextActionsPanelProps {
  actions: NextAction[];
  /** Facts shown when everything is up to date. */
  facts: { label: string; value: string | number }[];
  /** Maximum cards in the panel (rest is reachable via "see all"). */
  limit?: number;
  className?: string;
}

export function NextActionsPanel({
  actions,
  facts,
  limit = 3,
  className,
}: NextActionsPanelProps) {
  const { t } = useTranslation("dashboard");
  const visible = actions.slice(0, limit);

  return (
    <AppPanel
      density="compact"
      className={cn("min-w-0 space-y-4", className)}
      data-testid="dashboard-next-actions"
    >
      <div className="flex items-center justify-between gap-3">
        <AppEyebrow>{t("next_actions")}</AppEyebrow>
        <Link
          to="/app/calendar"
          className="shrink-0 text-xs font-medium text-brand-ink underline-offset-4 hover:underline"
        >
          {t("see_all")}
        </Link>
      </div>

      {visible.length === 0 ? (
        <AllClearBanner facts={facts} />
      ) : (
        <div
          className={cn(
            "grid gap-3",
            visible.length >= 3
              ? "md:grid-cols-2 xl:grid-cols-3"
              : visible.length === 2
                ? "md:grid-cols-2"
                : "",
          )}
        >
          {visible.map((a) => (
            <NextActionCard key={a.id} action={a} />
          ))}
        </div>
      )}
    </AppPanel>
  );
}

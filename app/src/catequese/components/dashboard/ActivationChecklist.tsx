import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, X, ArrowRight, PartyPopper } from "lucide-react";
import { cn } from "../../../client/utils";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { Button } from "../../../client/components/ui/button";
import {
  computeActivationFlags,
  type ActivationStatsInput,
} from "../../../shared/activation";
import {
  trackActivationMilestone,
  trackFirstValueReached,
} from "../../../client/analytics/marketingAnalytics";
import { useActiveWorkspace } from "../../../client/hooks/useActiveWorkspace";
import { useUserContext } from "../../../client/hooks/useUserContext";

const DISMISS_KEY = "cv-activation-checklist-dismissed";
const CELEBRATED_KEY = "cv-first-value-celebrated";

type Step = {
  id: string;
  done: boolean;
  title: string;
  description: string;
  to: string;
  isNext: boolean;
  isBonus: boolean;
};

/**
 * Post-onboarding activation: one highlighted next action.
 * Complete (= hide) when first value is reached:
 * class + people + (attendance OR meeting).
 */
export function ActivationChecklist({
  stats,
}: {
  stats: ActivationStatsInput | null | undefined;
}) {
  const { t } = useTranslation("dashboard");
  const { workspaceType, isPersonal } = useActiveWorkspace();
  const { userRole } = useUserContext();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [celebrated, setCelebrated] = useState(() => {
    try {
      return localStorage.getItem(CELEBRATED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const milestonesSent = useRef<Set<string>>(new Set());

  const flags = useMemo(() => computeActivationFlags(stats), [stats]);

  // Path A analytics: milestones + first_value (deduped)
  useEffect(() => {
    if (userRole === "GUARDIAN" || userRole === "CATECHUMEN") return;

    const profile =
      isPersonal || userRole === "PERSONAL_OWNER"
        ? "personal"
        : "institutional";

    const maybeMilestone = (id: string, done: boolean) => {
      if (!done || milestonesSent.current.has(id)) return;
      milestonesSent.current.add(id);
      trackActivationMilestone({
        milestone: id as "class" | "people" | "attendance" | "meeting",
        profile,
        workspace_type: workspaceType,
      });
    };

    maybeMilestone("class", flags.hasClasses);
    maybeMilestone("people", flags.hasPeople);
    maybeMilestone("attendance", flags.hasAnyAttendance);
    maybeMilestone("meeting", flags.hasAnyMeeting);

    if (flags.firstValueReached) {
      const path =
        flags.hasAnyAttendance && flags.hasAnyMeeting
          ? "both"
          : flags.hasAnyAttendance
            ? "attendance"
            : "meeting";
      trackFirstValueReached({
        profile,
        workspace_type: workspaceType,
        path,
      });
    }
  }, [flags, isPersonal, userRole, workspaceType]);

  const steps: Step[] = useMemo(() => {
    const firstClassId = flags.firstClassId;
    const defs = [
      {
        id: "class" as const,
        done: flags.hasClasses,
        title: t("activation.step_class_title"),
        description: t("activation.step_class_desc"),
        to: firstClassId ? `/app/classes/${firstClassId}` : "/app/classes/new",
      },
      {
        id: "people" as const,
        done: flags.hasPeople,
        title: t("activation.step_people_title"),
        description: t("activation.step_people_desc"),
        to: firstClassId
          ? `/app/classes/${firstClassId}`
          : "/app/catechumens/new",
      },
      {
        id: "attendance" as const,
        done: flags.hasAnyAttendance,
        title: t("activation.step_attendance_title"),
        description: t("activation.step_attendance_desc"),
        to: firstClassId
          ? `/app/classes/${firstClassId}/attendance`
          : "/app/classes",
      },
      {
        id: "meeting" as const,
        done: flags.hasAnyMeeting,
        title: t("activation.step_meeting_title"),
        description: t("activation.step_meeting_desc"),
        to: firstClassId
          ? `/app/classes/${firstClassId}/meetings`
          : "/app/ai-hub",
      },
    ];

    return defs.map((s) => ({
      ...s,
      isNext: flags.nextStep?.id === s.id,
      isBonus: flags.bonusStep?.id === s.id,
    }));
  }, [flags, t]);

  // Progress toward first value: 3 milestones (class, people, action)
  const foundationDone =
    (flags.hasClasses ? 1 : 0) +
    (flags.hasPeople ? 1 : 0) +
    (flags.hasAnyAttendance || flags.hasAnyMeeting ? 1 : 0);
  const foundationTotal = 3;

  if (dismissed) return null;

  // Celebrate first value once, then hide
  if (flags.firstValueReached) {
    if (celebrated) return null;

    const dismissCelebrate = () => {
      try {
        localStorage.setItem(CELEBRATED_KEY, "1");
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
      setCelebrated(true);
      setDismissed(true);
    };

    return (
      <section className="rounded-sm border border-brand-gold/40 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <AppEyebrow>{t("activation.celebrate_eyebrow")}</AppEyebrow>
            <AppDisplayTitle as="h2" className="text-lg sm:text-lg">
              <span className="inline-flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-brand-gold" aria-hidden />
                {t("activation.celebrate_title")}
              </span>
            </AppDisplayTitle>
            <AppGoldRule className="mt-2" />
            <p className="text-sm text-muted-foreground">
              {t("activation.celebrate_desc")}
            </p>
            {flags.bonusStep && (
              <Button asChild className="mt-3 h-11 rounded-sm shadow-none">
                <Link
                  to={
                    steps.find((s) => s.id === flags.bonusStep?.id)?.to ||
                    "/app"
                  }
                >
                  {flags.bonusStep.id === "meeting"
                    ? t("activation.bonus_meeting")
                    : t("activation.bonus_attendance")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 text-muted-foreground hover:text-brand-ink"
            onClick={dismissCelebrate}
            aria-label={t("activation.dismiss")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </section>
    );
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const next = steps.find((s) => s.isNext);

  return (
    <section className="rounded-sm border border-border/70 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <AppEyebrow>{t("activation.eyebrow")}</AppEyebrow>
          <AppDisplayTitle as="h2" className="mt-1 text-lg sm:text-lg">
            {t("activation.title")}
          </AppDisplayTitle>
          <AppGoldRule className="mt-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            {t("activation.progress", {
              done: foundationDone,
              total: foundationTotal,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-muted-foreground hover:text-brand-ink"
          onClick={dismiss}
          aria-label={t("activation.dismiss")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {next && (
        <div className="mb-4 rounded-sm border border-brand-ink/15 bg-muted/30 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("activation.next_label")}
          </p>
          <p className="font-brand-display mt-1 text-base font-semibold tracking-tight text-brand-ink">
            {next.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {next.description}
          </p>
          <Button asChild className="mt-3 h-11 rounded-sm shadow-none">
            <Link to={next.to}>
              {t("activation.next_cta")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      <ol className="space-y-1 border-t border-border/70">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.to}
              className={cn(
                "flex min-h-11 items-start gap-3 border-b border-border/60 px-1 py-3 last:border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                step.done
                  ? "opacity-70"
                  : step.isNext
                    ? "bg-muted/20"
                    : "hover:bg-muted/20",
              )}
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-ink" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-semibold tracking-tight",
                    step.done
                      ? "text-muted-foreground line-through"
                      : "text-brand-ink",
                  )}
                  style={
                    step.done
                      ? undefined
                      : { fontFamily: "var(--font-brand-display)" }
                  }
                >
                  {step.title}
                </span>
                {!step.done && !step.isNext && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </span>
              {!step.done && (
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

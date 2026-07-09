import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, X, ArrowRight } from 'lucide-react';
import { cn } from '../../../client/utils';
import { Button } from '../../../client/components/ui/button';

const DISMISS_KEY = 'cv-activation-checklist-dismissed';

type ActivationStats = {
  activeClasses?: number;
  activeCatechumens?: number;
  avgAttendance?: number;
  upcomingMeetings?: unknown[];
  myClasses?: { id: string; name?: string }[];
};

type Step = {
  id: string;
  done: boolean;
  title: string;
  description: string;
  to: string;
};

/**
 * First-session guidance after onboarding: class → people → attendance → meeting.
 * Hidden when all steps are complete or the user dismisses it.
 */
export function ActivationChecklist({ stats }: { stats: ActivationStats | null | undefined }) {
  const { t } = useTranslation('dashboard');
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const firstClassId = stats?.myClasses?.[0]?.id;
  const hasClasses = (stats?.activeClasses || 0) > 0 || Boolean(firstClassId);
  const hasPeople = (stats?.activeCatechumens || 0) > 0;
  const hasAttendance = (stats?.avgAttendance || 0) > 0;
  const hasMeeting = (stats?.upcomingMeetings?.length || 0) > 0;

  const steps: Step[] = useMemo(
    () => [
      {
        id: 'class',
        done: hasClasses,
        title: t('activation.step_class_title'),
        description: t('activation.step_class_desc'),
        to: firstClassId ? `/app/classes/${firstClassId}` : '/app/classes/new',
      },
      {
        id: 'people',
        done: hasPeople,
        title: t('activation.step_people_title'),
        description: t('activation.step_people_desc'),
        to: firstClassId ? `/app/classes/${firstClassId}` : '/app/catechumens/new',
      },
      {
        id: 'attendance',
        done: hasAttendance,
        title: t('activation.step_attendance_title'),
        description: t('activation.step_attendance_desc'),
        to: '/app/attendance',
      },
      {
        id: 'meeting',
        done: hasMeeting,
        title: t('activation.step_meeting_title'),
        description: t('activation.step_meeting_desc'),
        to: '/app/ai-hub',
      },
    ],
    [firstClassId, hasAttendance, hasClasses, hasMeeting, hasPeople, t]
  );

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (dismissed || allDone) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <section className="rounded-3xl border border-primary/15 bg-gradient-to-br from-white via-slate-50 to-primary/[0.04] p-5 shadow-sm shadow-slate-200/60">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {t('activation.eyebrow')}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            {t('activation.title')}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t('activation.progress', { done: doneCount, total: steps.length })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-700"
          onClick={dismiss}
          aria-label={t('activation.dismiss')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.to}
              className={cn(
                'flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors',
                step.done
                  ? 'border-border/50 bg-white/60'
                  : 'border-border/70 bg-white hover:border-primary/30 hover:bg-primary/[0.02]'
              )}
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    step.done ? 'text-slate-500 line-through' : 'text-slate-950'
                  )}
                >
                  {step.title}
                </span>
                {!step.done && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    {step.description}
                  </span>
                )}
              </span>
              {!step.done && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

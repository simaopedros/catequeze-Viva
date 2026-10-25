import { useEffect, useState } from "react";
import * as m from "motion/react-m";
import { CalendarDays, Check, History, Sparkles } from "lucide-react";
import { cn } from "../../client/utils";
import { useLandingText } from "../hooks/useLandingText";
import { prefersReducedMotion, useCountUp } from "./homeMotionEnv";

/** Advances 0 → total while `play`; restarts every time `play` turns on. */
function useStepper(total: number, play: boolean, intervalMs: number) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!play) return;
    if (prefersReducedMotion()) {
      setCount(total);
      return;
    }
    setCount(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= total) window.clearInterval(id);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [play, total, intervalMs]);
  return count;
}

function MockHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="mb-4 border-b border-brand-ink/8 pb-3">
      <p className="font-brand-display text-lg font-semibold leading-tight text-brand-ink">
        {title}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>
    </div>
  );
}

export function PrepareMock({ ns, play }: { ns: string; play: boolean }) {
  const tr = useLandingText(ns);
  const itemsRaw = tr("home.how.prepare.items", { returnObjects: true });
  const items = Array.isArray(itemsRaw) ? (itemsRaw as string[]) : [];
  const checked = useStepper(items.length, play, 380);
  const done = items.length > 0 && checked >= items.length;

  return (
    <div className="flex h-full flex-col">
      <MockHeader
        title={tr("home.how.prepare.title")}
        meta={tr("home.how.prepare.meta")}
      />
      <ul className="space-y-2">
        {items.map((item, i) => {
          const on = checked > i;
          return (
            <li
              key={item}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-[12px] transition-colors duration-300",
                on
                  ? "border-brand-gold/30 bg-[#FFF9EF] text-brand-ink"
                  : "border-brand-ink/8 bg-white text-brand-ink/50",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                  on
                    ? "border-brand-gold bg-brand-gold text-white"
                    : "border-brand-ink/15 bg-white",
                )}
              >
                {on ? (
                  <m.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </m.span>
                ) : null}
              </span>
              <span className="font-medium">{item}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex justify-center pt-3">
        <m.span
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-semibold text-white"
          initial={false}
          animate={{ opacity: done ? 1 : 0, y: done ? 0 : 8, scale: done ? 1 : 0.9 }}
          transition={{ duration: 0.35 }}
        >
          <Sparkles className="h-3 w-3" />
          {tr("home.how.prepare.done")}
        </m.span>
      </div>
    </div>
  );
}

const ATTENDANCE = ["present", "present", "justified", "present", "absent", "present"] as const;
const MARK_STYLES = {
  present: "bg-emerald-600 text-white",
  absent: "bg-rose-600 text-white",
  justified: "bg-amber-400 text-brand-ink",
} as const;

export function AttendanceMock({ ns, play }: { ns: string; play: boolean }) {
  const tr = useLandingText(ns);
  const studentsRaw = tr("home.how.attendance.students", { returnObjects: true });
  const students = Array.isArray(studentsRaw) ? (studentsRaw as string[]).slice(0, 6) : [];
  const marked = useStepper(students.length, play, 320);
  const present = useCountUp(19, play, 2000);
  const absent = useCountUp(2, play, 2000);
  const justified = useCountUp(1, play, 2000);

  const labels = {
    present: String(tr("home.how.attendance.present")),
    absent: String(tr("home.how.attendance.absent")),
    justified: String(tr("home.how.attendance.justified")),
  };

  return (
    <div className="flex h-full flex-col">
      <MockHeader
        title={tr("home.how.attendance.title")}
        meta={tr("home.how.attendance.meta")}
      />
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        {(
          [
            ["present", present, "text-emerald-700"],
            ["absent", absent, "text-rose-600"],
            ["justified", justified, "text-amber-600"],
          ] as const
        ).map(([key, value, color]) => (
          <div key={key} className="rounded-lg border border-brand-ink/8 bg-white py-2">
            <p className={cn("font-brand-display text-2xl font-semibold tabular-nums leading-none", color)}>
              {value}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">{labels[key]}</p>
          </div>
        ))}
      </div>
      <ul className="space-y-1.5">
        {students.map((name, i) => {
          const status = ATTENDANCE[i] ?? "present";
          const on = marked > i;
          return (
            <li
              key={name}
              className="flex items-center gap-2.5 rounded-lg border border-brand-ink/8 bg-white px-2.5 py-1.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-ink/8 text-[10px] font-semibold text-brand-ink">
                {name.charAt(0)}
              </span>
              <span className="flex-1 text-[12px] font-medium text-brand-ink">{name}</span>
              <span className="relative h-6 w-6">
                <span className="absolute inset-0 rounded-md border border-dashed border-brand-ink/15" />
                {on ? (
                  <m.span
                    className={cn(
                      "absolute inset-0 flex items-center justify-center rounded-md text-[11px] font-bold",
                      MARK_STYLES[status],
                    )}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 22 }}
                  >
                    {labels[status].charAt(0)}
                  </m.span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const BARS = [0.72, 0.86, 0.64, 0.95, 0.9, 1];
const RING_R = 40;

export function FollowMock({ ns, play }: { ns: string; play: boolean }) {
  const tr = useLandingText(ns);
  const pct = useCountUp(91, play, 1600);
  const ringDuration = prefersReducedMotion() ? 0 : 1.6;

  return (
    <div className="flex h-full flex-col">
      <MockHeader
        title={tr("home.how.follow.title")}
        meta={tr("home.how.follow.meta")}
      />
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(7,26,45,0.08)" strokeWidth="9" />
            <m.circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke="#D39A2B"
              strokeWidth="9"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: play ? 0.91 : 0 }}
              transition={{ duration: ringDuration, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-brand-display text-2xl font-semibold tabular-nums text-brand-ink">
            {pct}%
          </span>
        </div>
        <p className="text-[12px] font-medium leading-snug text-brand-ink/80">
          {tr("home.how.follow.ring_label")}
        </p>
      </div>

      <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {tr("home.how.follow.bars_label")}
      </p>
      <div className="flex h-16 items-end gap-1.5">
        {BARS.map((h, i) => (
          <m.span
            key={i}
            className="flex-1 origin-bottom rounded-t-md bg-gradient-to-t from-brand-ink to-brand-ink-soft"
            style={{ height: `${h * 100}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: play ? 1 : 0 }}
            transition={{ duration: 0.6, delay: play ? 0.2 + i * 0.08 : 0, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>

      <dl className="mt-auto grid gap-1.5 pt-3 text-[12px]">
        <div className="flex items-center gap-2 rounded-lg border border-brand-ink/8 bg-white px-2.5 py-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-brand-gold-muted" aria-hidden />
          <dt className="text-muted-foreground">{tr("home.how.follow.next_label")}</dt>
          <dd className="ml-auto font-semibold text-brand-ink">{tr("home.how.follow.next_value")}</dd>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-brand-ink/8 bg-white px-2.5 py-1.5">
          <History className="h-3.5 w-3.5 text-brand-gold-muted" aria-hidden />
          <dt className="text-muted-foreground">{tr("home.how.follow.last_label")}</dt>
          <dd className="ml-auto font-semibold text-brand-ink">{tr("home.how.follow.last_value")}</dd>
        </div>
      </dl>
    </div>
  );
}

export const HOW_MOCKS = [PrepareMock, AttendanceMock, FollowMock];

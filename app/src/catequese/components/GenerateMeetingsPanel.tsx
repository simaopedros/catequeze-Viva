import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CalendarPlus, Loader2, Plus } from "lucide-react";
import { createMeeting } from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { AppPanel } from "../../client/components/brand/AppChrome";
import { toast } from "../../client/hooks/use-toast";
import {
  todayInAppTimezone,
  toAppCalendarDate,
} from "../../shared/calendarDate";
import {
  resolveClassDayOfWeek,
  weeklyMeetingDates,
} from "../../shared/classSchedule";

const COUNT_OPTIONS = [4, 8, 12] as const;

type Props = {
  classId: string;
  cls: {
    dayOfWeek?: unknown;
    meetings?: Array<{ date?: string | Date | null }> | null;
  };
  onCreated: () => void;
};

export function GenerateMeetingsPanel({ classId, cls, onCreated }: Props) {
  const { t } = useTranslation("classes");
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    () => resolveClassDayOfWeek(cls) ?? 6,
  );
  const [count, setCount] = useState<number>(4);
  const [creating, setCreating] = useState(false);

  const handleGenerate = async () => {
    const existing = (cls.meetings || [])
      .filter((m) => m?.date)
      .map((m) => todayInAppTimezone(toAppCalendarDate(m.date as string)));
    const dates = weeklyMeetingDates(
      todayInAppTimezone(),
      dayOfWeek,
      count,
      existing,
    );
    setCreating(true);
    let created = 0;
    try {
      for (const date of dates) {
        await createMeeting({
          classId,
          title: t("detail.generated_meeting_title", {
            number: created + 1,
          }),
          date,
        });
        created += 1;
      }
      toast({ title: t("detail.generate_success", { count: created }) });
    } catch (e: any) {
      toast({
        title: t("detail.generate_error", { count: created }),
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
      if (created > 0) onCreated();
    }
  };

  return (
    <AppPanel className="space-y-3 p-4" padded={false}>
      <div className="flex items-center gap-2">
        <CalendarPlus className="h-4 w-4 text-brand-ink" />
        <h3 className="text-sm font-semibold tracking-tight text-brand-ink">
          {t("detail.generate_title")}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("detail.generate_desc")}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("detail.generate_weekday")}
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="h-10 rounded-sm border border-input bg-background px-2 text-sm text-foreground"
            disabled={creating}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <option key={i} value={i}>
                {t(`days_long.${i}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("detail.generate_count")}
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="h-10 rounded-sm border border-input bg-background px-2 text-sm text-foreground"
            disabled={creating}
          >
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {t("detail.generate_count_option", { count: n })}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          className="h-10 rounded-md"
          onClick={() => void handleGenerate()}
          disabled={creating}
        >
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CalendarPlus className="mr-2 h-4 w-4" />
          )}
          {t("detail.generate_button")}
        </Button>
        <Button asChild variant="outline" className="h-10 rounded-md">
          <Link to={`/app/classes/${classId}/attendance`}>
            <Plus className="mr-2 h-4 w-4" />
            {t("detail.generate_single")}
          </Link>
        </Button>
      </div>
    </AppPanel>
  );
}

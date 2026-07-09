import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { ArrowRight, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

export type ClassSetupDetails = {
  className: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
};

interface ClassSetupStepProps {
  onComplete: (details: ClassSetupDetails) => void;
  loading: boolean;
  initial?: Partial<ClassSetupDetails>;
}

const DAY_KEYS = ["0", "1", "2", "3", "4", "5", "6"];

export function ClassSetupStep({
  onComplete,
  loading,
  initial,
}: ClassSetupStepProps) {
  const { t } = useTranslation("onboarding");
  const [className, setClassName] = useState(initial?.className || "");
  const [dayOfWeek, setDayOfWeek] = useState(initial?.dayOfWeek || "");
  const [startTime, setStartTime] = useState(initial?.startTime || "");
  const [endTime, setEndTime] = useState(initial?.endTime || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [showOptional, setShowOptional] = useState(
    Boolean(initial?.dayOfWeek || initial?.startTime || initial?.location),
  );
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = className.trim();
    if (!name) {
      setLocalError(t("class_setup.name_required"));
      return;
    }
    setLocalError("");
    onComplete({
      className: name,
      dayOfWeek: dayOfWeek || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      location: location.trim() || undefined,
    });
  };

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("class_setup.eyebrow")}
        </p>
        <h2
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {t("class_setup.title")}
        </h2>
        <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("class_setup.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {localError && (
          <div className="rounded-sm border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {localError}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="ob-class-name" className="text-xs font-medium">
            {t("class_setup.name_label")}
          </Label>
          <Input
            id="ob-class-name"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder={t("class_setup.name_placeholder")}
            className="h-11 rounded-sm"
            autoFocus
            disabled={loading}
            required
          />
          <p className="text-xs text-muted-foreground">
            {t("class_setup.name_hint")}
          </p>
        </div>

        <div className="border border-border/70 rounded-sm">
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
          >
            <span>
              {showOptional
                ? t("class_setup.optional_hide")
                : t("class_setup.optional_show")}
            </span>
            {showOptional ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showOptional && (
            <div className="space-y-4 border-t border-border/70 px-4 pb-4 pt-3">
              <p className="text-xs text-muted-foreground">
                {t("class_setup.optional_hint")}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ob-day" className="text-xs font-medium">
                  {t("class_setup.day")}
                </Label>
                <select
                  id="ob-day"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="flex h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
                  disabled={loading}
                >
                  <option value="">{t("class_setup.day_placeholder")}</option>
                  {DAY_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {t(`class_setup.days.${k}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-start" className="text-xs font-medium">
                    {t("class_setup.start_time")}
                  </Label>
                  <Input
                    id="ob-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-11 rounded-sm"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-end" className="text-xs font-medium">
                    {t("class_setup.end_time")}
                  </Label>
                  <Input
                    id="ob-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-11 rounded-sm"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-location" className="text-xs font-medium">
                  {t("class_setup.location")}
                </Label>
                <Input
                  id="ob-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("class_setup.location_placeholder")}
                  className="h-11 rounded-sm"
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-sm shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("class_setup.saving")}
            </>
          ) : (
            <>
              {t("class_setup.continue")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

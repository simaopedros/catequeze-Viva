import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

const DAY_VALUES = ["0", "1", "2", "3", "4", "5", "6"];

interface CoordinatorDetailsProps {
  parishName: string;
  onComplete: (data: {
    yearName: string;
    yearStart: string;
    yearEnd: string;
    className?: string;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
  }) => void;
}

export function CoordinatorDetails({ parishName, onComplete }: CoordinatorDetailsProps) {
  const { t } = useTranslation("onboarding");
  const [step, setStep] = useState<"class" | "year">("class");
  const [yearName, setYearName] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [className, setClassName] = useState("");
  const [skipClass, setSkipClass] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("6");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [location, setLocation] = useState(parishName || "");
  const [dateError, setDateError] = useState("");
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  const handleYearFinish = () => {
    if (yearStart && yearEnd && yearEnd <= yearStart) {
      setDateError(t("coordinator.date_error"));
      return;
    }
    setDateError("");
    onComplete({
      yearName,
      yearStart,
      yearEnd,
      className: skipClass ? undefined : className.trim() || undefined,
      dayOfWeek: skipClass ? undefined : dayOfWeek,
      startTime: skipClass ? undefined : startTime,
      endTime: skipClass ? undefined : endTime,
      location: skipClass ? undefined : location || undefined,
    });
  };

  return (
    <div className="space-y-7">
      {step === "class" && (
        <>
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("coordinator.progress_status_class")}
            </p>
            <h2
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {t("coordinator.class_title")}
            </h2>
            <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
            <p className="text-sm leading-relaxed text-muted-foreground">{t("coordinator.class_desc")}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="coord-class-name" className="text-xs font-medium">
                {t("coordinator.class_name")}
              </Label>
              <Input
                id="coord-class-name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="h-11 rounded-sm"
                placeholder={t("coordinator.class_name_placeholder")}
                disabled={skipClass}
                autoFocus
              />
            </div>

            {!skipClass && (
              <div className="border border-border/70 rounded-sm">
                <button
                  type="button"
                  onClick={() => setShowOptionalDetails((current) => !current)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
                >
                  <span>
                    {showOptionalDetails
                      ? t("coordinator.optional_details_hide")
                      : t("coordinator.optional_details_toggle")}
                  </span>
                  {showOptionalDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showOptionalDetails && (
                  <div className="space-y-4 border-t border-border/70 px-4 pb-4 pt-3">
                    <p className="text-xs text-muted-foreground">{t("coordinator.optional_details_hint")}</p>

                    <div className="space-y-1.5">
                      <Label htmlFor="coord-day" className="text-xs font-medium">
                        {t("coordinator.day_of_week")}
                      </Label>
                      <select
                        id="coord-day"
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(e.target.value)}
                        className="flex h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
                      >
                        {DAY_VALUES.map((d) => (
                          <option key={d} value={d}>
                            {t(`coordinator.days.${d}`)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="coord-start" className="text-xs font-medium">
                          {t("coordinator.start_time")}
                        </Label>
                        <Input
                          id="coord-start"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-11 rounded-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="coord-end" className="text-xs font-medium">
                          {t("coordinator.end_time")}
                        </Label>
                        <Input
                          id="coord-end"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="h-11 rounded-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="coord-location" className="text-xs font-medium">
                        {t("coordinator.location")}
                      </Label>
                      <Input
                        id="coord-location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="h-11 rounded-sm"
                        placeholder={parishName}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={skipClass}
                onChange={(e) => {
                  setSkipClass(e.target.checked);
                  if (e.target.checked) setClassName("");
                }}
                className="h-4 w-4 rounded-sm border-input"
              />
              {t("coordinator.skip_class")}
            </label>
          </div>

          <Button type="button" onClick={() => setStep("year")} className="h-11 w-full rounded-sm shadow-none">
            {t("coordinator.next")}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </>
      )}

      {step === "year" && (
        <>
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("coordinator.progress_status_year")}
            </p>
            <h2
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {t("coordinator.year_title")}
            </h2>
            <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
            <p className="text-sm leading-relaxed text-muted-foreground">{t("coordinator.year_desc")}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="year-name" className="text-xs font-medium">
                {t("coordinator.year_name")}
              </Label>
              <Input
                id="year-name"
                value={yearName}
                onChange={(e) => setYearName(e.target.value)}
                className="h-11 rounded-sm"
                placeholder={t("coordinator.year_name_placeholder")}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="year-start" className="text-xs font-medium">
                  {t("coordinator.start")}
                </Label>
                <Input
                  id="year-start"
                  type="date"
                  value={yearStart}
                  onChange={(e) => setYearStart(e.target.value)}
                  className="h-11 rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year-end" className="text-xs font-medium">
                  {t("coordinator.end")}
                </Label>
                <Input
                  id="year-end"
                  type="date"
                  value={yearEnd}
                  onChange={(e) => setYearEnd(e.target.value)}
                  className="h-11 rounded-sm"
                />
              </div>
            </div>
            {dateError && (
              <div className="rounded-sm border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {dateError}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <Button
              type="button"
              onClick={handleYearFinish}
              disabled={!yearName.trim()}
              className="h-11 w-full rounded-sm shadow-none"
            >
              {t("coordinator.finish")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => setStep("class")}
              className="py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("coordinator.back")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

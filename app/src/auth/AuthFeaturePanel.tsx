import { useTranslation } from "react-i18next";
import { Check, CalendarDays, UsersRound, FileText, Heart } from "lucide-react";
import { BrowserFrame } from "../landing-page/components/BrowserFrame";
import { DashboardMock } from "../landing-page/components/mockups/DashboardMock";
import {
  AUTH_SCENES,
  type AuthScene,
  useAuthSceneCycle,
} from "./useAuthSceneCycle";
import "./authFeaturePanel.css";

function FeatureMock({
  scene,
  animate,
}: {
  scene: AuthScene;
  animate: boolean;
}) {
  const { t } = useTranslation("auth");
  const tr = (key: string) => t(`feature_panel.${key}`);
  if (scene === "dashboard")
    return <DashboardMock ns="auth" animate={animate} />;
  const names = [tr("maria"), tr("pedro"), tr("ana")];
  const rows =
    scene === "classes"
      ? [tr("class_name"), tr("class_second"), tr("class_third")]
      : scene === "calendar"
        ? ["12", "19", "26"]
        : scene === "records"
          ? [tr("maria")]
          : names;
  const Icon =
    scene === "families"
      ? Heart
      : scene === "calendar"
        ? CalendarDays
        : scene === "records"
          ? FileText
          : UsersRound;
  return (
    <div className="space-y-3 p-4 text-brand-ink">
      <div className="flex items-center gap-2 border-b border-brand-ink/10 pb-3">
        <Icon className="h-4 w-4" />
        <p className="font-brand-display text-base font-semibold">
          {tr(`${scene}.title`)}
        </p>
      </div>
      {scene === "attendance" && (
        <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">
          {tr("class_name")}
        </p>
      )}
      {rows.map((row, i) => (
        <div
          key={row}
          className="auth-feature-card flex items-center gap-3 rounded-lg border border-brand-ink/10 bg-white p-3"
          style={{ animationDelay: `${i * 140}ms` }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-gold/15 text-sm font-semibold">
            {scene === "calendar" ? row : row.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">
              {scene === "calendar" ? tr("meeting") : row}
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              {tr(
                scene === "calendar"
                  ? "date"
                  : scene === "classes"
                    ? "class_meta"
                    : scene === "families"
                      ? "family_meta"
                      : scene === "attendance"
                        ? "attendance_meta"
                        : "record_meta",
              )}
            </p>
          </div>
          {scene === "attendance" && (
            <Check
              className="auth-feature-check h-5 w-5 text-emerald-700"
              style={{ animationDelay: `${450 + i * 400}ms` }}
            />
          )}
        </div>
      ))}
      {scene === "records" && (
        <div className="space-y-3 rounded-lg border border-brand-ink/10 p-3 text-xs">
          <p>{tr("class_name")}</p>
          <p>{tr("record_details")}</p>
          <p className="text-emerald-800">{tr("record_status")}</p>
        </div>
      )}
    </div>
  );
}

export default function AuthFeaturePanel() {
  const { t } = useTranslation("auth");
  const cycle = useAuthSceneCycle();
  const scene = AUTH_SCENES[cycle.index];
  return (
    <section
      aria-label={t("feature_panel.label")}
      className="auth-feature-panel relative"
      data-paused={cycle.paused}
      data-reduced={cycle.reduced}
      data-scene={scene}
      onMouseEnter={() => cycle.setHovered(true)}
      onMouseLeave={() => cycle.setHovered(false)}
      onFocusCapture={() => cycle.setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          cycle.setFocused(false);
      }}
    >
      <div
        className="auth-feature-glow pointer-events-none absolute -inset-5 rounded-full bg-brand-gold/10 blur-2xl"
        aria-hidden="true"
      />
      <div key={scene} className="auth-feature-scene relative">
        <div className="h-[5.5rem]">
          <h2 className="font-brand-display text-xl font-semibold text-white">
            {t(`feature_panel.${scene}.title`)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#C5D0DC]">
            {t(`feature_panel.${scene}.description`)}
          </p>
        </div>
        <div aria-hidden="true" className="pointer-events-none select-none">
          <BrowserFrame
            aspect="natural"
            url="catechis.app/app"
            contentClassName="h-[300px] bg-[#F8FAFC]"
          >
            <FeatureMock scene={scene} animate={!cycle.paused} />
          </BrowserFrame>
        </div>
      </div>
      <p className="relative mt-3 text-[11px] text-[#C5D0DC]">
        {t("feature_panel.example")}
      </p>
      <div
        className="relative mt-2 flex flex-wrap items-center"
        role="group"
        aria-label={t("feature_panel.navigation")}
      >
        {AUTH_SCENES.map((item, i) => (
          <button
            key={item}
            type="button"
            aria-label={t("feature_panel.show", {
              scene: t(`feature_panel.${item}.title`),
            })}
            aria-pressed={i === cycle.index}
            onClick={() => cycle.select(i)}
            className="flex h-11 w-11 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
          >
            <span
              className={`h-1.5 rounded-full ${
                i === cycle.index ? "w-6 bg-brand-gold" : "w-2 bg-[#A8B8C9]"
              }`}
            />
          </button>
        ))}
        {!cycle.reduced && (
          <button
            type="button"
            onClick={cycle.toggleStopped}
            aria-pressed={cycle.stopped}
            className="min-h-11 rounded-md px-2 text-xs text-[#E8EEF5] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
          >
            {t(cycle.stopped ? "feature_panel.resume" : "feature_panel.pause")}
          </button>
        )}
      </div>
    </section>
  );
}

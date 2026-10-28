import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  CalendarDays,
  UsersRound,
  FileText,
  Heart,
  LayoutDashboard,
} from "lucide-react";
import {
  AUTH_SCENES,
  type AuthScene,
  useAuthSceneCycle,
} from "./useAuthSceneCycle";
import "./authFeaturePanel.css";

const icons = {
  dashboard: LayoutDashboard,
  classes: UsersRound,
  attendance: Check,
  records: FileText,
  families: Heart,
  calendar: CalendarDays,
};

function Count({
  value,
  paused,
  reduced,
}: {
  value: number;
  paused: boolean;
  reduced: boolean;
}) {
  const [progress, setProgress] = useState(paused ? 1 : 0);
  useEffect(() => {
    if (paused || reduced || progress >= 1) return;
    const timer = window.setTimeout(
      () => setProgress((p) => Math.min(1, p + 0.08)),
      60,
    );
    return () => window.clearTimeout(timer);
  }, [paused, reduced, progress]);
  return <>{Math.round(value * (reduced ? 1 : progress))}</>;
}

function FeatureMock({
  scene,
  paused,
  reduced,
}: {
  scene: AuthScene;
  paused: boolean;
  reduced: boolean;
}) {
  const { t } = useTranslation("auth");
  const tr = (key: string) => t(`feature_panel.${key}`);
  const names = [tr("maria"), tr("pedro"), tr("ana")];
  const Icon = icons[scene];
  const count = (value: number) => (
    <Count value={value} paused={paused} reduced={reduced} />
  );
  return (
    <div className={`auth-mock auth-mock-${scene}`}>
      <div className="auth-mock-toolbar">
        <span className="auth-mock-brand">C</span>
        <strong>Catechis</strong>
        <span className="auth-mock-dots">•••</span>
      </div>
      <div className="auth-mock-body">
        <div className="auth-mock-heading">
          <Icon size={18} />
          <strong>{tr(`${scene}.title`)}</strong>
          <span>2026</span>
        </div>
        {scene === "dashboard" && (
          <>
            <div className="auth-metrics">
              {[
                [142, "people"],
                [8, "groups"],
                [87, "average"],
              ].map(([value, label]) => (
                <div key={label}>
                  <small>{tr(`demo.${label}`)}</small>
                  <b>
                    {count(Number(value))}
                    {label === "average" ? "%" : ""}
                  </b>
                </div>
              ))}
            </div>
            <div className="auth-chart">
              <small>{tr("demo.week")}</small>
              <div className="auth-bars">
                {[42, 70, 55, 88, 66, 95, 78].map((v, i) => (
                  <div key={i}>
                    <i
                      style={{
                        height: `${v}%`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                    <span>{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="auth-reminder">
              <CalendarDays />
              <div>
                <small>{tr("demo.next")}</small>
                <strong>{tr("class_name")}</strong>
                <span>{tr("date")}</span>
              </div>
            </div>
          </>
        )}
        {scene === "classes" && (
          <div className="auth-class-stack">
            {["class_name", "class_second", "class_third"].map((key, i) => (
              <div
                className="auth-feature-card auth-class-card"
                key={key}
                style={{ animationDelay: `${i * 220}ms` }}
              >
                <div className="auth-class-top">
                  <span className="auth-avatar">{["C", "E", "I"][i]}</span>
                  <strong>{tr(key)}</strong>
                  <span>{[14, 18, 12][i]}</span>
                </div>
                <small>{tr("demo.journey")}</small>
                <div className="auth-progress">
                  <i
                    style={{
                      width: `${[76, 52, 34][i]}%`,
                      animationDelay: `${i * 220 + 250}ms`,
                    }}
                  />
                </div>
                <div className="auth-class-bottom">
                  <div className="auth-avatars">
                    {names.map((n) => (
                      <span key={n}>{n.charAt(0)}</span>
                    ))}
                    <span>+{[11, 15, 9][i]}</span>
                  </div>
                  <small>{tr("class_meta")}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        {scene === "attendance" && (
          <>
            <div className="auth-attendance-total">
              <span>{tr("class_name")}</span>
              <b>{tr("demo.present")}</b>
              <strong>
                {count(12)}{" "}
                <span className="auth-attendance-caption">
                  {tr("demo.of_total")}
                </span>
              </strong>
            </div>
            <div className="auth-roll">
              {[...names, tr("demo.lucas")].map((name, i) => (
                <div className="auth-person" key={name}>
                  <span className="auth-avatar">{name.charAt(0)}</span>
                  <span>{name}</span>
                  <i
                    className="auth-feature-check"
                    style={{ animationDelay: `${450 + i * 480}ms` }}
                  >
                    <Check size={17} />
                  </i>
                </div>
              ))}
            </div>
          </>
        )}
        {scene === "records" && (
          <>
            <div className="auth-profile">
              <span className="auth-avatar">M</span>
              <strong>{names[0]}</strong>
              <small>{tr("record_meta")}</small>
              <span className="auth-seal">{tr("demo.sacrament")}</span>
            </div>
            <div className="auth-fields">
              {[
                ["demo.name", names[0]],
                ["demo.group", tr("class_name")],
                ["demo.guardian", names[2]],
                ["demo.status", tr("record_status")],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className="auth-feature-card"
                  style={{ animationDelay: `${i * 300}ms` }}
                >
                  <small>{tr(label)}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </>
        )}
        {scene === "families" && (
          <>
            <div className="auth-family-title">
              <Heart size={28} />
              <strong>{tr("demo.family")}</strong>
              <small>{tr("family_meta")}</small>
            </div>
            <div className="auth-family-tree">
              <div className="auth-parents">
                {names.slice(1).map((n) => (
                  <div key={n}>
                    <span className="auth-avatar">{n.charAt(0)}</span>
                    <strong>{n}</strong>
                    <small>{tr("demo.guardian")}</small>
                  </div>
                ))}
              </div>
              <svg viewBox="0 0 300 90" preserveAspectRatio="none">
                <path d="M75 0 V32 Q75 42 85 42 H215 Q225 42 225 32 V0 M150 42 V90" />
              </svg>
              <div
                className="auth-child auth-feature-card"
                style={{ animationDelay: "900ms" }}
              >
                <span className="auth-avatar">M</span>
                <strong>{names[0]}</strong>
                <small>{tr("class_name")}</small>
              </div>
            </div>
          </>
        )}
        {scene === "calendar" && (
          <>
            <div className="auth-month">
              <strong>{tr("demo.month")}</strong>
              <span>2026</span>
            </div>
            <div className="auth-calendar">
              {Array.from({ length: 42 }, (_, i) => {
                const day = i - 3;
                const hit = [12, 19, 26].indexOf(day);
                return (
                  <span
                    key={i}
                    className={hit >= 0 ? "auth-day-meeting" : ""}
                    style={{ animationDelay: `${450 + hit * 500}ms` }}
                  >
                    {day > 0 && day <= 31 ? day : ""}
                  </span>
                );
              })}
            </div>
            <div className="auth-reminder">
              <CalendarDays />
              <div>
                <small>{tr("demo.reminder")}</small>
                <strong>{tr("meeting")}</strong>
                <span>{tr("date")}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthFeaturePanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { t } = useTranslation("auth");
  const cycle = useAuthSceneCycle();
  const scene = AUTH_SCENES[cycle.index];
  const Icon = icons[scene];
  const lastScene = useRef(scene);
  const [outgoing, setOutgoing] = useState<AuthScene | null>(null);
  useEffect(() => {
    if (lastScene.current === scene) return;
    setOutgoing(lastScene.current);
    lastScene.current = scene;
    const timer = window.setTimeout(() => setOutgoing(null), 450);
    return () => window.clearTimeout(timer);
  }, [scene]);
  return (
    <section
      aria-label={t("feature_panel.label")}
      className={`auth-feature-panel ${compact ? "auth-feature-compact" : ""}`}
      data-mode={compact ? "compact" : "full"}
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
      <div className="auth-feature-glow" aria-hidden="true" />
      {compact ? (
        <div className="auth-compact-content">
          <Icon aria-hidden="true" size={22} />
          <h2>{t(`feature_panel.${scene}.title`)}</h2>
          <div
            key={scene}
            className={`auth-mini auth-mini-${scene}`}
            aria-hidden="true"
          >
            {scene === "calendar" ? (
              [12, 19, 26].map((n) => <i key={n}>{n}</i>)
            ) : scene === "attendance" ? (
              <>
                <Check size={16} />
                <span>12/14</span>
              </>
            ) : scene === "records" ? (
              <>
                <FileText size={16} />
                <i />
                <i />
              </>
            ) : scene === "families" ? (
              <>
                <span>P</span>
                <i />
                <span>M</span>
              </>
            ) : (
              <>
                {[45, 75, 60].map((v) => (
                  <i key={v} style={{ height: `${v}%` }} />
                ))}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="auth-feature-stage">
            {AUTH_SCENES.map((item) => (
              <div
                key={item}
                className="auth-feature-scene"
                data-active={scene === item}
                aria-hidden={scene !== item}
              >
                <div className="auth-scene-content">
                  <h2>{t(`feature_panel.${item}.title`)}</h2>
                  <p className="auth-scene-description">
                    {t(`feature_panel.${item}.description`)}
                  </p>
                  <div aria-hidden="true" className="auth-mock-wrap">
                    {(scene === item || outgoing === item) && (
                      <FeatureMock
                        scene={item}
                        paused={cycle.paused || scene !== item}
                        reduced={cycle.reduced}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div key={scene} className="auth-floating-chip" aria-hidden="true">
              <Check size={14} />
              {t(`feature_panel.demo.chips.${scene}`)}
            </div>
          </div>
          <p className="auth-example">{t("feature_panel.example")}</p>
        </>
      )}
      <div
        className="auth-feature-controls relative mt-2 flex flex-wrap items-center"
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

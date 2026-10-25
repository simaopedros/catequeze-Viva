import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Award, Heart, Sparkles, Sprout, Star, Sunrise } from "lucide-react";
import {
  firstNameOf,
  type EncouragementTier,
} from "../../lib/attendanceEncouragement";

type TimelineItem = { id?: string; date: string; status: string };

type TierStyle = {
  background: string;
  border: string;
  accent: string;
  title: string;
  ring: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

const BRAND_INK = "#071A2D";
const BRAND_GOLD = "#D39A2B";
const BRAND_GOLD_MUTED = "#8A6418";
const SUCCESS = "#1f7a52";

const TIER_STYLES: Record<Exclude<EncouragementTier, "none">, TierStyle> = {
  perfect: {
    background: "linear-gradient(135deg, #fffaf0 0%, #fdefd2 100%)",
    border: BRAND_GOLD,
    accent: BRAND_GOLD,
    title: BRAND_GOLD_MUTED,
    ring: BRAND_GOLD,
    Icon: Award,
  },
  excellent: {
    background: "linear-gradient(135deg, #f3fbf6 0%, #e3f4ea 100%)",
    border: "#9fd5b8",
    accent: BRAND_GOLD,
    title: SUCCESS,
    ring: SUCCESS,
    Icon: Star,
  },
  good: {
    background: "#f3fbf6",
    border: "#b7dfc9",
    accent: SUCCESS,
    title: SUCCESS,
    ring: SUCCESS,
    Icon: Sparkles,
  },
  missYou: {
    background: "#fff8ec",
    border: "#f2d6a2",
    accent: "#c27c0e",
    title: BRAND_GOLD_MUTED,
    ring: BRAND_GOLD,
    Icon: Heart,
  },
  newStart: {
    background: "#eef4fb",
    border: "#c6d8ee",
    accent: "#2f6aa8",
    title: "#1e4f82",
    ring: "#2f6aa8",
    Icon: Sunrise,
  },
};

const DOT_COLORS: Record<string, { fill: string; stroke: string }> = {
  PRESENT: { fill: SUCCESS, stroke: SUCCESS },
  LATE: { fill: BRAND_GOLD, stroke: BRAND_GOLD },
  JUSTIFIED: { fill: "#9db8d9", stroke: "#9db8d9" },
  ABSENT: { fill: "#ffffff", stroke: "#c4c4cc" },
  NOT_FILLED: { fill: "#f4f4f5", stroke: "#e4e4e7" },
};

const MAX_DOTS = 40;

export function ProgressRing({
  value,
  color,
  size = 84,
  stroke = 8,
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${clamped}%`}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="#ffffff"
        stroke="#ececf0"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size * 0.24}
        fontWeight={700}
        fill={BRAND_INK}
        fontFamily="system-ui, sans-serif"
      >
        {clamped}%
      </text>
    </svg>
  );
}

function PerfectSeal({ size = 84 }: { size?: number }) {
  const points = Array.from({ length: 24 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 24 - Math.PI / 2;
    const r = i % 2 === 0 ? size / 2 : size / 2 - 5;
    return `${size / 2 + r * Math.cos(angle)},${size / 2 + r * Math.sin(angle)}`;
  }).join(" ");
  return (
    <svg
      width={size}
      height={size + 14}
      viewBox={`0 0 ${size} ${size + 14}`}
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d={`M${size * 0.3} ${size * 0.7} L${size * 0.22} ${size + 12} L${size * 0.36} ${size + 4} L${size * 0.46} ${size + 13} L${size * 0.48} ${size * 0.72} Z`}
        fill={BRAND_GOLD_MUTED}
      />
      <path
        d={`M${size * 0.7} ${size * 0.7} L${size * 0.78} ${size + 12} L${size * 0.64} ${size + 4} L${size * 0.54} ${size + 13} L${size * 0.52} ${size * 0.72} Z`}
        fill={BRAND_GOLD_MUTED}
      />
      <polygon points={points} fill={BRAND_GOLD} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 11}
        fill="#fffaf0"
        stroke={BRAND_GOLD_MUTED}
        strokeWidth={1.5}
      />
      <text
        x="50%"
        y={size / 2 - 4}
        textAnchor="middle"
        fontSize={size * 0.22}
        fontWeight={800}
        fill={BRAND_INK}
        fontFamily="system-ui, sans-serif"
      >
        100%
      </text>
      <text
        x="50%"
        y={size / 2 + size * 0.17}
        textAnchor="middle"
        fontSize={size * 0.2}
        fill={BRAND_GOLD}
        fontFamily="system-ui, sans-serif"
      >
        ★★★
      </text>
    </svg>
  );
}

export function PresenceTrail({
  items,
  label,
  legend,
}: {
  items: TimelineItem[];
  label: string;
  legend: { status: string; label: string }[];
}) {
  if (!items.length) return null;
  const visible = items.slice(-MAX_DOTS);
  return (
    <div style={{ marginTop: "12px" }}>
      <p
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#6b7280",
          margin: "0 0 6px",
        }}
      >
        {label}
      </p>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}
        aria-hidden
      >
        {visible.map((item, i) => {
          const colors = DOT_COLORS[item.status] || DOT_COLORS.NOT_FILLED;
          return (
            <span
              key={item.id || `${item.date}-${i}`}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "999px",
                background: colors.fill,
                border: `1.5px solid ${colors.stroke}`,
                display: "inline-block",
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "6px",
          fontSize: "10px",
          color: "#6b7280",
        }}
      >
        {legend.map((entry) => {
          const colors = DOT_COLORS[entry.status];
          return (
            <span
              key={entry.status}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: colors.fill,
                  border: `1.5px solid ${colors.stroke}`,
                  display: "inline-block",
                }}
              />
              {entry.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function AttendanceEncouragementCard({
  tier,
  name,
  frequency,
  attendedCount,
  totalMeetings,
  timeline = [],
  variant = "screen",
}: {
  tier: EncouragementTier;
  name: string;
  frequency: number;
  attendedCount: number;
  totalMeetings: number;
  timeline?: TimelineItem[];
  variant?: "screen" | "print";
}) {
  const { t } = useTranslation("pastoralAnalysis");
  if (tier === "none") return null;
  const style = TIER_STYLES[tier];
  const { Icon } = style;
  const firstName = firstNameOf(name);
  const isPrint = variant === "print";

  const legend = [
    { status: "PRESENT", label: t("present") },
    { status: "LATE", label: t("late") },
    { status: "JUSTIFIED", label: t("justified") },
    { status: "ABSENT", label: t("trailMissed") },
  ];

  return (
    <div
      data-testid="attendance-encouragement"
      data-tier={tier}
      style={{
        position: "relative",
        overflow: "hidden",
        background: style.background,
        border: `${tier === "perfect" ? 2 : 1}px solid ${style.border}`,
        borderRadius: isPrint ? "12px" : "4px",
        padding: isPrint ? "16px 18px" : "14px 16px",
        marginBottom: isPrint ? "16px" : 0,
        breakInside: "avoid",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        color: BRAND_INK,
        fontFamily: isPrint ? "system-ui, sans-serif" : undefined,
      }}
    >
      {tier === "perfect" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "8px",
            right: "14px",
            color: BRAND_GOLD,
            fontSize: "14px",
            letterSpacing: "6px",
            opacity: 0.7,
          }}
        >
          ✦ ✧ ✦
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {tier === "perfect" ? (
          <PerfectSeal size={isPrint ? 88 : 72} />
        ) : (
          <ProgressRing
            value={frequency}
            color={style.ring}
            size={isPrint ? 88 : 72}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              borderRadius: "999px",
              background: "#ffffff",
              border: `1px solid ${style.border}`,
              color: style.title,
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "2px 10px",
            }}
          >
            <Icon size={12} color={style.accent} strokeWidth={2.5} />
            {t(`encouragement.${tier}.badge`)}
          </span>
          <p
            style={{
              fontSize: isPrint ? "18px" : "16px",
              fontWeight: 700,
              lineHeight: 1.25,
              margin: "6px 0 4px",
              color: style.title,
            }}
          >
            {t(`encouragement.${tier}.title`, { name: firstName })}
          </p>
          <p
            style={{
              fontSize: isPrint ? "13px" : "12px",
              lineHeight: 1.5,
              margin: 0,
              color: "#374151",
            }}
          >
            {t(`encouragement.${tier}.message`)}
          </p>
          <p
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontStyle: "italic",
              color: "#6b7280",
              margin: "8px 0 0",
            }}
          >
            <Sprout size={12} color={style.accent} />
            {t(`encouragement.${tier}.verse`)}
          </p>
        </div>
      </div>
      <p
        style={{
          fontSize: "11px",
          color: "#4b5563",
          margin: "10px 0 0",
          fontWeight: 600,
        }}
      >
        {t("encouragement.summary", {
          attended: attendedCount,
          total: totalMeetings,
        })}
      </p>
      <PresenceTrail
        items={timeline}
        label={t("encouragement.trailTitle")}
        legend={legend}
      />
    </div>
  );
}

import type { CSSProperties } from "react";
import { cn } from "../../client/utils";

const GRAINS = [
  { cx: 32, cy: 15.5, r: 0 },
  { cx: 29.6, cy: 18.6, r: -28 },
  { cx: 34.4, cy: 18.6, r: 28 },
  { cx: 29.7, cy: 22.6, r: -28 },
  { cx: 34.3, cy: 22.6, r: 28 },
];

function draw(delayMs: number, durationMs: number): CSSProperties {
  return {
    animationDelay: `${delayMs}ms`,
    ["--home-draw-duration" as string]: `${durationMs}ms`,
  };
}

/**
 * Seed → sprout → wheat ear, drawn with stroke-dashoffset (CSS only).
 * `delay` shifts the whole sequence, e.g. to replay it lower on the page.
 */
export function SeedSprout({
  className,
  tone = "ink",
  delay = 0,
}: {
  className?: string;
  tone?: "ink" | "light";
  delay?: number;
}) {
  const stroke = tone === "ink" ? "#071A2D" : "#FFFFFF";
  const soil = tone === "ink" ? "#8A6418" : "#F1C76B";
  const d = (ms: number) => delay + ms;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={cn("overflow-visible", className)}
    >
      <circle
        cx="32"
        cy="32"
        r="29"
        pathLength={1}
        stroke="#D39A2B"
        strokeOpacity={0.45}
        strokeWidth={1}
        className="home-draw"
        style={draw(d(1300), 1200)}
      />
      <path
        d="M12 51 C20 48 44 48 52 51"
        pathLength={1}
        stroke={soil}
        strokeWidth={1.6}
        strokeLinecap="round"
        className="home-draw"
        style={draw(d(0), 600)}
      />
      <ellipse
        cx="32"
        cy="49.5"
        rx="3.2"
        ry="2.2"
        fill={stroke}
        className="home-pop"
        style={{ animationDelay: `${d(250)}ms` }}
      />
      <path
        d="M32 48 C32.4 40 31.4 31 32 18"
        pathLength={1}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        className="home-draw"
        style={draw(d(450), 800)}
      />
      <path
        d="M31.8 38 C26.5 37.5 22.5 33.5 21.5 28.5 C26.8 29 30.6 32.6 31.8 38 Z"
        pathLength={1}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
        className="home-draw"
        style={draw(d(900), 600)}
      />
      <path
        d="M32.2 33 C37.5 32.5 41.5 28.5 42.5 23.5 C37.2 24 33.4 27.6 32.2 33 Z"
        pathLength={1}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
        className="home-draw"
        style={draw(d(1000), 600)}
      />
      {GRAINS.map((g, i) => (
        <g key={i} transform={`rotate(${g.r} ${g.cx} ${g.cy})`}>
          <ellipse
            cx={g.cx}
            cy={g.cy}
            rx="1.6"
            ry="2.8"
            fill="#D39A2B"
            className="home-pop"
            style={{ animationDelay: `${d(1200 + i * 80)}ms` }}
          />
        </g>
      ))}
    </svg>
  );
}

/** Tall decorative wheat stalk for the hero sides (desktop only). */
export function WheatStalk({
  className,
  delay = 0,
  flip = false,
}: {
  className?: string;
  delay?: number;
  flip?: boolean;
}) {
  const grains = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg
      viewBox="0 0 120 420"
      fill="none"
      aria-hidden
      className={cn(flip && "-scale-x-100", className)}
    >
      <path
        d="M60 418 C58 330 66 230 58 120 C56 90 60 60 62 30"
        pathLength={1}
        stroke="#8A6418"
        strokeWidth={1.4}
        strokeLinecap="round"
        className="home-draw"
        style={draw(delay, 1600)}
      />
      <path
        d="M59 300 C40 290 26 270 22 246 C42 252 56 270 59 300 Z"
        pathLength={1}
        stroke="#8A6418"
        strokeWidth={1.2}
        className="home-draw"
        style={draw(delay + 700, 900)}
      />
      <path
        d="M60 230 C80 220 94 200 98 176 C78 182 64 200 60 230 Z"
        pathLength={1}
        stroke="#8A6418"
        strokeWidth={1.2}
        className="home-draw"
        style={draw(delay + 850, 900)}
      />
      {grains.map((i) => {
        const y = 40 + i * 13;
        const side = i % 2 === 0 ? -1 : 1;
        const cx = 61 + side * 7;
        return (
          <g key={i} transform={`rotate(${side * 30} ${cx} ${y})`}>
            <ellipse
              cx={cx}
              cy={y}
              rx="3.4"
              ry="7"
              fill="#D39A2B"
              fillOpacity={0.75}
              className="home-pop"
              style={{ animationDelay: `${delay + 1300 + i * 90}ms` }}
            />
          </g>
        );
      })}
    </svg>
  );
}

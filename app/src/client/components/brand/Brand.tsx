import { useId, type SVGProps } from "react";
import { cn } from "../../utils";

type BrandMarkProps = {
  className?: string;
  title?: string;
} & SVGProps<SVGSVGElement>;

type BrandLockupProps = {
  className?: string;
  compact?: boolean;
  tone?: "default" | "inverse";
  /** Kept for call-site compatibility; badge is no longer rendered. */
  hideBadge?: boolean;
};

type BrandMedallionProps = {
  className?: string;
};

export function BrandMark({
  className,
  title = "Catechis",
  ...props
}: BrandMarkProps) {
  const id = useId().replace(/:/g, "");
  const bgId = `cv-mark-bg-${id}`;
  const goldId = `cv-mark-gold-${id}`;

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      <defs>
        <linearGradient
          id={bgId}
          x1="10"
          y1="8"
          x2="54"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#153a63" />
          <stop offset="0.55" stopColor="#0d2745" />
          <stop offset="1" stopColor="#071a2d" />
        </linearGradient>
        <linearGradient
          id={goldId}
          x1="20"
          y1="14"
          x2="44"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f4cf7a" />
          <stop offset="1" stopColor="#d39a2b" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill={`url(#${bgId})`} />
      <path
        d="M20 50V26.5C20 18 25.2 13 32 13C38.8 13 44 18 44 26.5V50H20Z"
        fill="none"
        stroke={`url(#${goldId})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M25.5 49.5V29.5C25.5 24 28.2 21 32 21C35.8 21 38.5 24 38.5 29.5V49.5H25.5Z"
        fill="#081728"
      />
      <rect x="30.5" y="16" width="3" height="17" rx="1.5" fill="#FFF7E7" />
      <rect x="25" y="21.5" width="14" height="3" rx="1.5" fill="#FFF7E7" />
      <path
        d="M19 47.5C23.1 43.6 27.5 41.6 32 41.6C36.5 41.6 40.9 43.6 45 47.5"
        fill="none"
        stroke="#F6D08A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M21.5 50.2C25.1 48.1 28.6 47 32 47C35.4 47 38.9 48.1 42.5 50.2"
        fill="none"
        stroke="#FFF7E7"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandLockup({
  className,
  compact = false,
  tone = "default",
}: BrandLockupProps) {
  const nameClass =
    tone === "inverse" ? "text-white" : "text-brand-ink";

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark
        className={cn("shrink-0", compact ? "h-8 w-8" : "h-10 w-10")}
      />
      <span
        className={cn(
          "min-w-0 truncate font-brand-display font-semibold tracking-[0.01em] leading-none",
          compact ? "text-[1.02rem]" : "text-[1.16rem]",
          nameClass,
        )}
      >
        Catechis
      </span>
    </span>
  );
}

export function BrandMedallion({ className }: BrandMedallionProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm border border-brand-gold/40 bg-brand-gold/10 p-3",
        className,
      )}
    >
      <BrandMark className="h-7 w-7" />
    </span>
  );
}

/**
 * Design tokens for programmatic access (charts, dynamic styles, etc.)
 * Mirrors CSS custom properties in Main.css.
 * Official theme for this product stage: light only.
 */

export const brandColors = {
  /** Deep institutional ink */
  ink: "#071A2D",
  inkSoft: "#0a2540",
  /** Pure gold accent */
  gold: "#D39A2B",
  goldMuted: "#8A6418",
} as const;

export const colors = {
  brand: {
    primary: "hsl(210, 73%, 10%)",
    warm: "hsl(40, 66%, 50%)",
    support: "hsl(33, 74%, 62%)",
    ink: brandColors.ink,
    gold: brandColors.gold,
  },
  semantic: {
    success: "hsl(141, 71%, 48%)",
    warning: "hsl(40, 66%, 50%)",
    error: "hsl(0, 84.2%, 60.2%)",
    info: "hsl(200, 98%, 39%)",
  },
  surface: {
    base: "hsl(0, 0%, 100%)",
    subtle: "hsl(210, 16%, 96%)",
    elevated: "hsl(0, 0%, 100%)",
    muted: "hsl(210, 14%, 90%)",
  },
  text: {
    primary: "hsl(210, 73%, 10%)",
    secondary: "hsl(210, 12%, 40%)",
    tertiary: "hsl(210, 12%, 40%, 0.7)",
    inverse: "hsl(0, 0%, 100%)",
  },
  stroke: {
    default: "hsl(210, 14%, 90%)",
    strong: "hsl(210, 14%, 85%)",
  },
} as const;

/** Tailwind-friendly class aliases for brand (prefer these over hard-coded hex) */
export const brandClasses = {
  textInk: "text-brand-ink",
  textGold: "text-brand-gold",
  bgInk: "bg-brand-ink",
  bgGold: "bg-brand-gold",
  borderInk: "border-brand-ink",
  borderGold: "border-brand-gold",
  /** Fallback when utility tokens not yet in all builds */
  textInkHex: "text-[#071A2D]",
  textGoldHex: "text-[#D39A2B]",
  bgGoldHex: "bg-[#D39A2B]",
  bgWhite: "bg-surface-base",
} as const;

/** Chart color palette — distributed, high contrast, accessible */
export const chartColors = [
  colors.brand.primary,
  colors.brand.warm,
  colors.semantic.success,
  colors.semantic.info,
  colors.brand.support,
  colors.semantic.warning,
  "hsl(262, 83%, 58%)",
  "hsl(340, 82%, 52%)",
  "hsl(180, 70%, 45%)",
  "hsl(80, 60%, 45%)",
] as const;

/** Spacing scale (0.25rem base) */
export const spacing = {
  unit: 4,
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
} as const;

/** Breakpoints in px — include acceptance viewports */
export const breakpoints = {
  "2xsm": 320,
  xsm: 360,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440,
  "3xl": 2000,
  /** Named acceptance sizes */
  iphoneSe: 320,
  androidCommon: 360,
  iphone14: 390,
  ipadPortrait: 768,
  ipadLandscape: 1024,
  laptop: 1280,
  desktop: 1440,
} as const;

/** Z-index scale */
export const zIndex = {
  base: 0,
  dropdown: 50,
  sticky: 100,
  overlay: 200,
  modal: 500,
  toast: 1000,
  /** Mobile chrome sits under modals */
  bottomNav: 100,
  cookieBanner: 150,
} as const;

/** Elevation tokens for inline styles */
export const elevation = {
  xs: "0px 1px 2px rgba(0, 0, 0, 0.05)",
  sm: "0px 1px 3px rgba(0, 0, 0, 0.08)",
  md: "0px 4px 10px rgba(0, 0, 0, 0.10)",
  lg: "0px 8px 20px rgba(0, 0, 0, 0.10)",
  xl: "0px 12px 32px rgba(0, 0, 0, 0.12)",
} as const;

/** Supported color scheme for this product stage */
export const supportedColorScheme = "light" as const;

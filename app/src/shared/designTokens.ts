/**
 * Design tokens for programmatic access (charts, dynamic styles, etc.)
 * Mirrors CSS custom properties in Main.css.
 * Official theme for this product stage: light only.
 * Visual language: papel litúrgico (ink + gold + paper).
 */

export const brandColors = {
  /** Deep institutional ink */
  ink: "#071A2D",
  inkSoft: "#0a2540",
  midnight: "#153A63",
  /** Pure gold accent */
  gold: "#D39A2B",
  goldMuted: "#8A6418",
  lightGold: "#F4CF7A",
  paper: "#FFF7E7",
  inkForeground: "#E8EEF5",
  inkMuted: "#A8B8C9",
  inkFaint: "#C5D0DC",
} as const;

export const colors = {
  brand: {
    primary: "hsl(210, 73%, 10%)",
    warm: "hsl(36, 22%, 94%)",
    support: "hsl(38, 28%, 93%)",
    ink: brandColors.ink,
    gold: brandColors.gold,
    midnight: brandColors.midnight,
    paper: brandColors.paper,
    lightGold: brandColors.lightGold,
  },
  semantic: {
    success: "hsl(152, 62%, 30%)",
    warning: "hsl(38, 92%, 50%)",
    error: "hsl(0, 74%, 46%)",
    info: "hsl(200, 98%, 39%)",
  },
  surface: {
    base: "hsl(38, 32%, 97%)",
    subtle: "hsl(36, 22%, 94%)",
    elevated: "hsl(0, 0%, 100%)",
    muted: "hsl(36, 18%, 90%)",
    paper: brandColors.paper,
  },
  text: {
    primary: "hsl(210, 73%, 10%)",
    secondary: "hsl(215, 18%, 34%)",
    tertiary: "hsl(215, 18%, 34%, 0.9)",
    inverse: "hsl(0, 0%, 100%)",
  },
  stroke: {
    default: "hsl(36, 18%, 86%)",
    strong: "hsl(36, 16%, 82%)",
  },
} as const;

/** Tailwind-friendly class aliases for brand (prefer these over hard-coded hex) */
export const brandClasses = {
  textInk: "text-brand-ink",
  textGold: "text-brand-gold",
  bgInk: "bg-brand-ink",
  bgGold: "bg-brand-gold",
  bgPaper: "bg-brand-paper",
  bgMidnight: "bg-brand-midnight",
  borderInk: "border-brand-ink",
  borderGold: "border-brand-gold",
  bgWhite: "bg-surface-elevated",
} as const;

/** Chart color palette — distributed, high contrast, accessible */
export const chartColors = [
  colors.brand.primary,
  colors.brand.gold,
  colors.semantic.success,
  colors.semantic.info,
  brandColors.midnight,
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
  xs: "0px 1px 1px rgba(7, 26, 45, 0.05)",
  sm: "0px 1px 1px rgba(7, 26, 45, 0.04), 0 1px 3px -1px rgba(7, 26, 45, 0.05)",
  md: "0px 2px 3px -1px rgba(7, 26, 45, 0.05), 0 6px 14px -4px rgba(7, 26, 45, 0.08)",
  lg: "0px 4px 8px -2px rgba(7, 26, 45, 0.06), 0 16px 32px -8px rgba(7, 26, 45, 0.12)",
  xl: "0px 12px 32px rgba(7, 26, 45, 0.12)",
} as const;

/** Supported color scheme for this product stage */
export const supportedColorScheme = "light" as const;

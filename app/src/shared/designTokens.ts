/**
 * Unique product design tokens — mirrored in:
 * - `src/client/Main.css` (CSS / Tailwind)
 * - `mobile/src/theme.ts` (Expo)
 *
 * Do not add a third brand gold. Rhema immersive video may use
 * `immersive` black surfaces, but accents are `gold` / `goldDark`.
 */

export const brandColors = {
  ink: "#071d36",
  inkSoft: "#123152",
  midnight: "#123152",
  gold: "#bd8b58",
  goldMuted: "#8d6238",
  goldDark: "#8d6238",
  lightGold: "#f6efe4",
  cream: "#f6efe4",
  paper: "#fffdf8",
  canvas: "#f4efe6",
  muted: "#5c6b7a",
  line: "#e6ddd0",
  danger: "#b42318",
  success: "#1f7a4d",
  late: "#c47a12",
  justified: "#3d5a80",
  white: "#ffffff",
  immersive: "#000000",
  immersiveElevated: "#111111",
  immersiveLine: "#1a1a1a",
  immersiveScrim: "rgba(0, 0, 0, 0.45)",
  inkForeground: "#e8eef5",
  inkMuted: "#c9d6e4",
  inkFaint: "#c5d0dc",
} as const;

export const colors = {
  brand: {
    primary: "hsl(212, 77%, 12%)",
    warm: "hsl(39, 39%, 93%)",
    support: "hsl(38, 47%, 93%)",
    ink: brandColors.ink,
    gold: brandColors.gold,
    midnight: brandColors.midnight,
    paper: brandColors.paper,
    lightGold: brandColors.lightGold,
  },
  semantic: {
    success: "hsl(150, 60%, 30%)",
    warning: "hsl(33, 83%, 42%)",
    error: "hsl(4, 76%, 40%)",
    info: "hsl(212, 45%, 20%)",
  },
  surface: {
    base: "hsl(39, 39%, 93%)",
    subtle: "hsl(38, 28%, 94%)",
    elevated: "hsl(0, 0%, 100%)",
    muted: "hsl(36, 22%, 90%)",
    paper: brandColors.paper,
  },
  text: {
    primary: "hsl(212, 77%, 12%)",
    secondary: "hsl(210, 14%, 42%)",
    tertiary: "hsl(210, 14%, 42%, 0.9)",
    inverse: "hsl(0, 0%, 100%)",
  },
  stroke: {
    default: "hsl(35, 31%, 86%)",
    strong: "hsl(35, 24%, 82%)",
  },
} as const;

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

export const chartColors = [
  brandColors.ink,
  brandColors.gold,
  brandColors.success,
  brandColors.goldDark,
  brandColors.inkSoft,
  brandColors.late,
  brandColors.justified,
  brandColors.cream,
] as const;

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

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const breakpoints = {
  "2xsm": 320,
  xsm: 360,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440,
  "3xl": 2000,
  iphoneSe: 320,
  androidCommon: 360,
  iphone14: 390,
  ipadPortrait: 768,
  ipadLandscape: 1024,
  laptop: 1280,
  desktop: 1440,
} as const;

export const zIndex = {
  base: 0,
  dropdown: 50,
  sticky: 100,
  overlay: 200,
  modal: 500,
  toast: 1000,
  bottomNav: 100,
  cookieBanner: 150,
} as const;

export const elevation = {
  xs: "0px 1px 1px rgba(7, 29, 54, 0.05)",
  sm: "0px 1px 1px rgba(7, 29, 54, 0.04), 0 1px 3px -1px rgba(7, 29, 54, 0.05)",
  md: "0px 2px 3px -1px rgba(7, 29, 54, 0.05), 0 6px 14px -4px rgba(7, 29, 54, 0.08)",
  lg: "0px 4px 8px -2px rgba(7, 29, 54, 0.06), 0 16px 32px -8px rgba(7, 29, 54, 0.12)",
  xl: "0px 12px 32px rgba(7, 29, 54, 0.12)",
} as const;

export const supportedColorScheme = "light" as const;

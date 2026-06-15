/**
 * Design tokens for programmatic access (charts, dynamic styles, etc.)
 * Mirrors the CSS custom properties defined in Main.css
 */

export const colors = {
  brand: {
    primary: 'hsl(210, 100%, 13%)',
    warm: 'hsl(32, 100%, 37%)',
    support: 'hsl(33, 74%, 62%)',
  },
  semantic: {
    success: 'hsl(141, 71%, 48%)',
    warning: 'hsl(36, 100%, 50%)',
    error: 'hsl(0, 84.2%, 60.2%)',
    info: 'hsl(200, 98%, 39%)',
  },
  surface: {
    base: 'hsl(0, 0%, 100%)',
    subtle: 'hsl(0, 0%, 96.1%)',
    elevated: 'hsl(0, 0%, 100%)',
  },
  text: {
    primary: 'hsl(0, 0%, 3.9%)',
    secondary: 'hsl(0, 0%, 45.1%)',
  },
} as const;

/** Chart color palette — distributed, high contrast, accessible */
export const chartColors = [
  colors.brand.primary,
  colors.brand.warm,
  colors.semantic.success,
  colors.semantic.info,
  colors.brand.support,
  colors.semantic.warning,
  'hsl(262, 83%, 58%)',
  'hsl(340, 82%, 52%)',
  'hsl(180, 70%, 45%)',
  'hsl(80, 60%, 45%)',
] as const;

/** Spacing scale (0.25rem base) */
export const spacing = {
  unit: 4,
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const;

/** Breakpoints in px */
export const breakpoints = {
  '2xsm': 375,
  xsm: 425,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 2000,
} as const;

/** Z-index scale for programmatic use when Tailwind classes aren't sufficient */
export const zIndex = {
  base: 0,
  dropdown: 50,
  sticky: 100,
  overlay: 200,
  modal: 500,
  toast: 1000,
} as const;

/** Elevation tokens for inline styles */
export const elevation = {
  xs: '0px 1px 2px rgba(0, 0, 0, 0.05)',
  sm: '0px 1px 3px rgba(0, 0, 0, 0.08)',
  md: '0px 4px 10px rgba(0, 0, 0, 0.10)',
  lg: '0px 8px 20px rgba(0, 0, 0, 0.10)',
  xl: '0px 12px 32px rgba(0, 0, 0, 0.12)',
} as const;

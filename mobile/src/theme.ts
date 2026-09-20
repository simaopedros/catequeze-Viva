/**
 * Native design tokens.
 * Brand colours stay ink / gold / paper; surfaces change:
 * canvas for operations, ink for chrome, paper only for liturgical reading.
 */

export const colors = {
  ink: '#071A2D',
  inkSoft: '#0a2540',
  midnight: '#153A63',
  gold: '#D39A2B',
  goldMuted: '#8A6418',
  lightGold: '#F4CF7A',
  goldSoft: 'rgba(211, 154, 43, 0.12)',
  paper: '#FFF7E7',
  white: '#ffffff',
  inkForeground: '#E8EEF5',
  inkMuted: '#A8B8C9',
  inkFaint: '#C5D0DC',
  inkHairline: 'rgba(7, 26, 45, 0.10)',
  inkOverlay: 'rgba(7, 26, 45, 0.45)',
  canvas: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceSubtle: '#EEF1F5',
  elevated: '#ffffff',
  textSecondary: '#4A5563',
  stroke: '#E2E6EC',
  strokeStrong: '#CBD3DE',
  danger: '#CC1F1F',
  success: '#1D7A4C',
  warning: '#F5A30A',
  /** @deprecated Use canvas */
  cream: '#F7F8FA',
  /** @deprecated Use textSecondary */
  muted: '#4A5563',
  /** @deprecated Use stroke */
  line: '#E2E6EC',
  /** @deprecated Use goldMuted */
  goldDark: '#8A6418',
} as const;

export const fonts = {
  sans: 'Figtree_400Regular',
  sansMedium: 'Figtree_500Medium',
  sansSemibold: 'Figtree_600SemiBold',
  sansBold: 'Figtree_700Bold',
  display: 'CormorantGaramond_600SemiBold',
  displayBold: 'CormorantGaramond_700Bold',
} as const;

export const type = {
  display: { fontSize: 32, lineHeight: 38, letterSpacing: -0.6, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3, fontWeight: '700' as const },
  titleSm: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, letterSpacing: 0, fontWeight: '400' as const },
  bodySm: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '400' as const },
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 1.2, fontWeight: '700' as const },
  micro: { fontSize: 10, lineHeight: 14, letterSpacing: 0.2, fontWeight: '600' as const },
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 9999,
} as const;

export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  xs: {
    shadowColor: colors.ink,
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;

export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  pressedOpacity: 0.72,
  pressedScale: 0.98,
} as const;

export const touch = {
  min: 44,
} as const;

export const navigationChrome = {
  headerStyle: { backgroundColor: colors.canvas },
  headerTintColor: colors.ink,
  headerTitleStyle: {
    fontFamily: fonts.sansBold,
    fontWeight: '700' as const,
    color: colors.ink,
    fontSize: 17,
  },
  headerShadowVisible: false,
  headerBackTitle: 'Voltar',
  contentStyle: { backgroundColor: colors.canvas },
  animation: 'fade' as const,
};

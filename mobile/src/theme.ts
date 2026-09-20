/**
 * Design tokens for the Expo app.
 * Mirrors app/src/shared/designTokens.ts and app/src/client/Main.css
 * (papel litúrgico: ink + gold + paper). Light only.
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
  surface: '#FBF6EE',
  surfaceSubtle: '#F3EBDC',
  elevated: '#ffffff',
  textSecondary: '#475566',
  stroke: '#E6D9C4',
  strokeStrong: '#DDD0B8',
  danger: '#CC1F1F',
  success: '#1D7A4C',
  warning: '#F5A30A',
  /** @deprecated Use paper */
  cream: '#FFF7E7',
  /** @deprecated Use textSecondary */
  muted: '#475566',
  /** @deprecated Use stroke */
  line: '#E6D9C4',
  /** @deprecated Use goldMuted */
  goldDark: '#8A6418',
} as const;

export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  display: 'CormorantGaramond_600SemiBold',
  displayBold: 'CormorantGaramond_700Bold',
} as const;

export const type = {
  display: { fontSize: 28, lineHeight: 34, letterSpacing: -0.4, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3, fontWeight: '700' as const },
  titleSm: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, letterSpacing: 0, fontWeight: '400' as const },
  bodySm: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '400' as const },
  overline: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, fontWeight: '700' as const },
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
  md: 10,
  lg: 12,
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
    shadowOpacity: 0.05,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
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
  headerStyle: { backgroundColor: colors.paper },
  headerTintColor: colors.ink,
  headerTitleStyle: {
    fontFamily: fonts.sansBold,
    fontWeight: '700' as const,
    color: colors.ink,
    fontSize: 17,
  },
  headerShadowVisible: false,
  headerBackTitle: 'Voltar',
  contentStyle: { backgroundColor: colors.paper },
  animation: 'fade' as const,
};

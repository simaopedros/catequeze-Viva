import { MD3LightTheme, configureFonts, type MD3Theme } from 'react-native-paper';

/** Tokens alinhados com a web (app/src/client/Main.css). */
export const colors = {
  ink: '#071A2D',
  inkSoft: '#0a2540',
  midnight: '#153A63',
  gold: '#D39A2B',
  goldDark: '#8A6418',
  goldLight: '#F4CF7A',
  cream: '#FBF6EC',
  paper: '#FFF7E7',
  surface: '#FFFFFF',
  muted: '#5c6b7a',
  line: '#E6D9C2',
  danger: '#b42318',
  success: '#1f7a4d',
  warning: '#B7791F',
  info: '#1D4ED8',
  white: '#ffffff',
  tabInactive: '#8aa0b5',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'CormorantGaramond_700Bold',
} as const;

const baseFont = { fontFamily: fontFamilies.regular, letterSpacing: 0 };

const fontConfig = {
  displayLarge: { ...baseFont, fontFamily: fontFamilies.display, fontSize: 44, lineHeight: 50, fontWeight: '700' as const },
  displayMedium: { ...baseFont, fontFamily: fontFamilies.display, fontSize: 36, lineHeight: 42, fontWeight: '700' as const },
  displaySmall: { ...baseFont, fontFamily: fontFamilies.display, fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  headlineLarge: { ...baseFont, fontFamily: fontFamilies.bold, fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  headlineMedium: { ...baseFont, fontFamily: fontFamilies.bold, fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  headlineSmall: { ...baseFont, fontFamily: fontFamilies.bold, fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  titleLarge: { ...baseFont, fontFamily: fontFamilies.semibold, fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
  titleMedium: { ...baseFont, fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  titleSmall: { ...baseFont, fontFamily: fontFamilies.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  labelLarge: { ...baseFont, fontFamily: fontFamilies.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  labelMedium: { ...baseFont, fontFamily: fontFamilies.medium, fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  labelSmall: { ...baseFont, fontFamily: fontFamilies.medium, fontSize: 11, lineHeight: 16, fontWeight: '500' as const },
  bodyLarge: { ...baseFont, fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { ...baseFont, fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodySmall: { ...baseFont, fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  default: { ...baseFont, fontWeight: '400' as const },
};

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 3,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.ink,
    onPrimary: colors.white,
    primaryContainer: '#DDE6F2',
    onPrimaryContainer: colors.ink,
    secondary: colors.gold,
    onSecondary: colors.ink,
    secondaryContainer: '#F8E7BF',
    onSecondaryContainer: colors.goldDark,
    tertiary: colors.midnight,
    onTertiary: colors.white,
    tertiaryContainer: '#D7E3F3',
    onTertiaryContainer: colors.ink,
    background: colors.cream,
    onBackground: colors.ink,
    surface: colors.surface,
    onSurface: colors.ink,
    surfaceVariant: colors.paper,
    onSurfaceVariant: colors.muted,
    outline: colors.line,
    outlineVariant: '#F0E7D6',
    error: colors.danger,
    onError: colors.white,
    errorContainer: '#FDE7E4',
    onErrorContainer: colors.danger,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: '#FFFBF3',
      level3: colors.paper,
      level4: '#FDF3DF',
      level5: '#FBEFD6',
    },
  },
};

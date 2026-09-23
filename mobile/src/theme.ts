import { Dimensions } from 'react-native';

export const colors = {
  canvas: '#F7F8FA',
  surface: '#FFFFFF',
  text: {
    primary: '#17212B',
    secondary: '#344454',
    muted: '#6B7B8C',
    placeholder: '#8795A5',
  },
  primary: {
    900: '#112B46',
    800: '#173B61',
    700: '#23577F',
    100: '#E8F0F7',
    50: '#F4F8FB',
  },
  accent: {
    700: '#C77A00',
    500: '#F1A51E',
    100: '#FFF1D3',
  },
  border: '#E1E7ED',
  borderStrong: '#CBD5DF',
  overlay: 'rgba(11,25,39,0.42)',
  success: '#217346',
  successBg: '#EAF6EE',
  warning: '#A65E00',
  warningBg: '#FFF3DF',
  danger: '#B42318',
  dangerBg: '#FDECEA',
  info: '#2A628F',
  infoBg: '#EAF3FA',
  white: '#FFFFFF',
  tabInactive: '#8795A5',
  skeleton: '#E9EEF3',
  skeletonHighlight: '#F5F7F9',
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  displayLg: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  headingXl: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  headingLg: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  headingMd: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  headingSm: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const },
  bodyLg: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  bodyMd: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodySm: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  labelLg: { fontSize: 14, lineHeight: 18, fontWeight: '600' as const },
  labelSm: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
};

export const elevation = {
  card: {
    shadowColor: '#0B1927',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
};

export function contentHorizontalPadding(width = Dimensions.get('window').width): number {
  return width <= 360 ? spacing[4] : spacing[5];
}

export const attendanceStatus = {
  PRESENT: { label: 'Presente', color: colors.success, bg: colors.successBg },
  ABSENT: { label: 'Falta', color: colors.danger, bg: colors.dangerBg },
  LATE: { label: 'Atraso', color: colors.warning, bg: colors.warningBg },
  EXCUSED: { label: 'Justificada', color: colors.info, bg: colors.infoBg },
} as const;

export type AttendanceStatusKey = keyof typeof attendanceStatus;

import { Platform } from 'react-native';

/** Brand stays ink / gold; cream is an accent, not the page. */
export const colors = {
  ink: '#071d36',
  inkSoft: '#123152',
  gold: '#bd8b58',
  goldDark: '#8d6238',
  rhemaGold: '#D4AF37',
  rhemaBlack: '#000000',
  cream: '#f6efe4',
  paper: '#fffdf8',
  canvas: '#f4efe6',
  muted: '#5c6b7a',
  line: '#e6ddd0',
  danger: '#b42318',
  success: '#1f7a4d',
  white: '#ffffff',
  bubbleMine: '#071d36',
  bubbleTheirs: '#f3eadc',
  present: '#1f7a4d',
  absent: '#b42318',
  late: '#c47a12',
  justified: '#3d5a80',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

/** Source Serif 4 + Inter; Dynamic Type still scales these sizes. */
export const fonts = {
  serif: 'SourceSerif4_600SemiBold',
  serifRegular: 'SourceSerif4_400Regular',
  serifBold: 'SourceSerif4_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  system: Platform.select({ ios: 'System', android: 'sans-serif', default: undefined }),
} as const;

export const type = {
  hero: { fontFamily: fonts.serifBold, fontSize: 32, lineHeight: 38, color: colors.ink },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34, color: colors.ink },
  titleSmall: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, color: colors.inkSoft },
  bodyStrong: { fontFamily: fonts.sansSemi, fontSize: 16, lineHeight: 22, color: colors.ink },
  caption: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, color: colors.muted },
  bible: { fontFamily: fonts.serifRegular, fontSize: 22, lineHeight: 34, color: colors.cream },
} as const;

export const attendanceTone = {
  PRESENT: { color: colors.present, shape: 'circle' as const, label: 'Presente' },
  ABSENT: { color: colors.absent, shape: 'square' as const, label: 'Ausente' },
  LATE: { color: colors.late, shape: 'diamond' as const, label: 'Atrasado' },
  JUSTIFIED: { color: colors.justified, shape: 'pill' as const, label: 'Justificado' },
} as const;

export type AttendanceStatusId = keyof typeof attendanceTone;

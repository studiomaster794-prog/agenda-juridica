export type ColorSchemeName = 'light' | 'dark';

export const palette = {
  navy: '#0C2340',
  navyMid: '#1A3A5C',
  gold: '#C4A35A',
  goldDeep: '#9A7B32',
  goldSoft: '#E8D5A3',
};

export const lightColors = {
  background: '#F3F0E8',
  surface: '#FFFFFF',
  surfaceAlt: '#EAE6DC',
  surfaceElevated: '#FFFFFF',
  text: '#0C2340',
  textSecondary: '#4A5A6A',
  textMuted: '#7A8694',
  border: '#E2DCD0',
  primary: '#0C2340',
  navyMid: '#1A3A5C',
  primaryContrast: '#F3F0E8',
  gold: '#C4A35A',
  goldDeep: '#9A7B32',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  success: '#2F6B4F',
  successSoft: '#E8F5EE',
  warning: '#C47A2C',
  warningSoft: '#FEF4E8',
  info: '#2B5F8A',
  infoSoft: '#E8F1F8',
  overlay: 'rgba(12, 35, 64, 0.45)',
  tabBar: '#FFFFFF',
  tabInactive: '#8A93A0',
  today: '#B42318',
  soon: '#C47A2C',
  future: '#2B5F8A',
  done: '#2F6B4F',
  cancelled: '#6B7280',
  fab: '#0C2340',
  inputBg: '#F7F5F0',
  shadow: '#0C2340',
};

export const darkColors: typeof lightColors = {
  background: '#0B1220',
  surface: '#152033',
  surfaceAlt: '#1C2B42',
  surfaceElevated: '#1A2940',
  text: '#F3F0E8',
  textSecondary: '#B8C0CA',
  textMuted: '#8A93A0',
  border: '#2A3B52',
  primary: '#E8EEF5',
  navyMid: '#8FA6C2',
  primaryContrast: '#0C2340',
  gold: '#D4B36A',
  goldDeep: '#C4A35A',
  danger: '#F97066',
  dangerSoft: '#3A1D1C',
  success: '#6FCF97',
  successSoft: '#1A3328',
  warning: '#E0A45A',
  warningSoft: '#3A2A16',
  info: '#7EB6E0',
  infoSoft: '#1A2E40',
  overlay: 'rgba(0, 0, 0, 0.55)',
  tabBar: '#101A2C',
  tabInactive: '#7A8694',
  today: '#F97066',
  soon: '#E0A45A',
  future: '#7EB6E0',
  done: '#6FCF97',
  cancelled: '#8A93A0',
  fab: '#C4A35A',
  inputBg: '#101A2C',
  shadow: '#000000',
};

export type ThemeColors = typeof lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
};

export const typography = {
  title: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.6 },
  h1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  small: { fontSize: 12, fontWeight: '500' as const },
};

export function getColors(scheme: ColorSchemeName): ThemeColors {
  return scheme === 'dark' ? darkColors : lightColors;
}

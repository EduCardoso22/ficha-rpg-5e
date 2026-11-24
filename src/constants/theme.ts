import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#16161A',
    background: '#F3EFEA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EAE4DC',
    textSecondary: '#64646E',
    border: '#DDD6CC',
    primary: '#A31629',
    onPrimary: '#FFFFFF',
    success: '#2E7D32',
    danger: '#C62828',
    input: '#FAF8F5',
  },
  dark: {
    text: '#F5F4F0',
    background: '#0B0C10',
    backgroundElement: '#15171E',
    backgroundSelected: '#222530',
    textSecondary: '#9CA0AE',
    border: '#282B36',
    primary: '#E63950',
    onPrimary: '#FFFFFF',
    success: '#4ADE80',
    danger: '#F87171',
    input: '#101218',
  },
} as const;

export type AccentPaletteKey = 'carmesim' | 'arcano' | 'esmeralda' | 'ambar' | 'abissal';

export const AccentPalettes: Record<
  AccentPaletteKey,
  { nome: string; light: string; dark: string; onPrimaryLight: string; onPrimaryDark: string }
> = {
  carmesim: {
    nome: 'Carmesim',
    light: '#A31629',
    dark: '#E63950',
    onPrimaryLight: '#FFFFFF',
    onPrimaryDark: '#FFFFFF',
  },
  arcano: {
    nome: 'Arcano',
    light: '#6D28D9',
    dark: '#A78BFA',
    onPrimaryLight: '#FFFFFF',
    onPrimaryDark: '#120826',
  },
  esmeralda: {
    nome: 'Esmeralda',
    light: '#15803D',
    dark: '#34D399',
    onPrimaryLight: '#FFFFFF',
    onPrimaryDark: '#06281E',
  },
  ambar: {
    nome: 'Dourado',
    light: '#B45309',
    dark: '#FBBF24',
    onPrimaryLight: '#FFFFFF',
    onPrimaryDark: '#1F1402',
  },
  abissal: {
    nome: 'Abissal',
    light: '#0369A1',
    dark: '#38BDF8',
    onPrimaryLight: '#FFFFFF',
    onPrimaryDark: '#041E2E',
  },
};

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 20,
} as const;

export const MaxContentWidth = 800;
export const MaxDesktopWidth = 1240;
export const DesktopBreakpoint = 960;

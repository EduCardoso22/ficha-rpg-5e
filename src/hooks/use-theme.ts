/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { AccentPalettes, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/store/useThemeStore';

export function useTheme() {
  const scheme = useColorScheme();
  const paletteKey = useThemeStore((s) => s.palette) ?? 'carmesim';
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const pal = AccentPalettes[paletteKey] ?? AccentPalettes.carmesim;

  return {
    ...Colors[theme],
    primary: theme === 'dark' ? pal.dark : pal.light,
    onPrimary: theme === 'dark' ? pal.onPrimaryDark : pal.onPrimaryLight,
  };
}

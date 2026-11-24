import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemeStore } from '@/store/useThemeStore';

/** Esquema efetivo: preferência do usuário ou, em "system", o do aparelho. */
export function useColorScheme(): 'light' | 'dark' {
  const system = useRNColorScheme();
  const pref = useThemeStore((s) => s.preference);
  if (pref === 'system') return system === 'dark' ? 'dark' : 'light';
  return pref;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AccentPaletteKey } from '@/constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  palette: AccentPaletteKey;
  setPreference: (p: ThemePreference) => void;
  setPalette: (p: AccentPaletteKey) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      palette: 'carmesim',
      setPreference: (preference) => set({ preference }),
      setPalette: (palette) => set({ palette }),
    }),
    { name: 'theme-pref', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

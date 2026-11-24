import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const keyForUser = (uid: string) => `tutorial_visto_${uid}`;

interface TutorialState {
  aberto: boolean;
  passo: number;
  uidVerificado: string | null;
  verificarTutorial: (uid: string) => Promise<void>;
  abrirTutorial: () => void;
  fecharTutorial: (uid?: string | null) => Promise<void>;
  setPasso: (passo: number) => void;
  resetarSessao: () => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  aberto: false,
  passo: 0,
  uidVerificado: null,

  verificarTutorial: async (uid) => {
    if (!uid || get().uidVerificado === uid) return;
    set({ uidVerificado: uid });
    try {
      const visto = await AsyncStorage.getItem(keyForUser(uid));
      if (visto !== '1') {
        set({ aberto: true, passo: 0 });
      }
    } catch {
      // Se o armazenamento falhar, nao bloqueia o uso do app
    }
  },

  abrirTutorial: () => set({ aberto: true, passo: 0 }),

  fecharTutorial: async (uid) => {
    set({ aberto: false, passo: 0 });
    const alvoUid = uid ?? get().uidVerificado;
    if (!alvoUid) return;
    try {
      await AsyncStorage.setItem(keyForUser(alvoUid), '1');
    } catch {
      // Ignora erro de persistencia
    }
  },

  setPasso: (passo) => set({ passo }),

  resetarSessao: () => set({ aberto: false, passo: 0, uidVerificado: null }),
}));

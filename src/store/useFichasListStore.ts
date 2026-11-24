import { Unsubscribe } from 'firebase/firestore';
import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

import { criarFicha, excluirFicha, ouvirFichasCompartilhadas, ouvirMinhasFichas } from '@/services/fichas';
import { criarFichaLocal, excluirFichaLocal, ouvirFichasLocais } from '@/services/fichasLocal';
import { Ficha, novaFicha } from '@/types/ficha';

import { LOCAL_GUEST_UID } from './useAuthStore';

interface ListState {
  minhas: Ficha[];
  compartilhadas: Ficha[];
  loading: boolean;
  error: string | null;
  start: (uid: string, email: string) => void;
  stop: () => void;
  remover: (id: string) => Promise<void>;
  duplicar: (ficha: Ficha, uid: string, email: string) => Promise<string>;
  importarJson: (uid: string, email: string, jsonText: string) => Promise<string>;
}

let unsubs: Unsubscribe[] = [];

export const useFichasListStore = create<ListState>((set, get) => ({
  minhas: [],
  compartilhadas: [],
  loading: true,
  error: null,
  start: (uid, email) => {
    unsubs.forEach((u) => u());
    set({ loading: true, error: null });
    if (uid === LOCAL_GUEST_UID) {
      unsubs = [
        ouvirFichasLocais((minhas) => set({ minhas, compartilhadas: [], loading: false })),
      ];
      return;
    }
    const onError = (e: Error) => set({ error: e.message, loading: false });
    unsubs = [
      ouvirMinhasFichas(uid, (minhas) => set({ minhas, loading: false }), onError),
      ...(email ? [ouvirFichasCompartilhadas(email, (compartilhadas) => set({ compartilhadas }), onError)] : []),
    ];
  },
  stop: () => {
    unsubs.forEach((u) => u());
    unsubs = [];
    set({ minhas: [], compartilhadas: [], loading: true });
  },
  remover: async (id: string) => {
    const anteriores = get().minhas;
    set({ minhas: anteriores.filter((f) => f.id !== id) });
    try {
      if (id.startsWith('local-')) {
        await excluirFichaLocal(id);
      } else {
        await excluirFicha(id);
      }
    } catch (e) {
      set({ minhas: anteriores, error: (e as Error).message });
      throw e;
    }
  },
  duplicar: async (ficha, uid, email) => {
    const json = serializarFichaJson({
      ...ficha,
      titulo: `${ficha.titulo || 'Personagem'} (Cópia)`,
    });
    return get().importarJson(uid, email, json);
  },
  importarJson: async (uid, email, jsonText) => {
    let parsed: Partial<Ficha>;
    try {
      parsed = JSON.parse(jsonText) as Partial<Ficha>;
    } catch {
      throw new Error('O texto fornecido não é um JSON válido.');
    }
    if (!parsed || typeof parsed !== 'object' || (!parsed.titulo && !parsed.lore?.nome)) {
      throw new Error('JSON inválido: não parece ser uma ficha de D&D 5e.');
    }
    const base = novaFicha(uid, email || 'convidado@local', parsed.titulo || parsed.lore?.nome || 'Personagem Importado');
    const dados: Omit<Ficha, 'id'> = {
      ...base,
      ...parsed,
      ownerId: uid,
      ownerEmail: (email || 'convidado@local').toLowerCase(),
      sharedWithEmails: Array.isArray(parsed.sharedWithEmails) ? parsed.sharedWithEmails : [],
      atributos: { ...base.atributos, ...(parsed.atributos ?? {}) },
      pv: { ...base.pv, ...(parsed.pv ?? {}) },
      dadosVida: { ...base.dadosVida, ...(parsed.dadosVida ?? {}) },
      morte: { ...base.morte, ...(parsed.morte ?? {}) },
      salvaguardas: { ...base.salvaguardas, ...(parsed.salvaguardas ?? {}) },
      personalidade: { ...base.personalidade, ...(parsed.personalidade ?? {}) },
      lore: { ...base.lore, ...(parsed.lore ?? {}) },
      conjurador: {
        ...base.conjurador,
        ...(parsed.conjurador ?? {}),
        slots: { ...base.conjurador.slots, ...(parsed.conjurador?.slots ?? {}) },
        magias: { ...base.conjurador.magias, ...(parsed.conjurador?.magias ?? {}) },
      },
      updatedAt: Date.now(),
    };
    delete (dados as Partial<Ficha>).id;
    if (uid === LOCAL_GUEST_UID) {
      return criarFichaLocal(dados);
    }
    return criarFicha(dados);
  },
}));

/** Serializa uma ficha para JSON formatado pronto para exportar/backup. */
export function serializarFichaJson(ficha: Ficha): string {
  const copia: Partial<Ficha> = { ...ficha };
  delete copia.id;
  delete copia.ownerId;
  delete copia.sharedWithEmails;
  return JSON.stringify(copia, null, 2);
}

/** Exibe o Alert nativo de confirmação antes de excluir a ficha. */
export function confirmarExclusaoFicha(onConfirm: () => void) {
  const msg = 'Tem certeza que deseja excluir esta ficha?';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(msg)) onConfirm();
    return;
  }
  Alert.alert('Excluir ficha', msg, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: onConfirm },
  ]);
}

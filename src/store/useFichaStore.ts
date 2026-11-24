import { Unsubscribe } from 'firebase/firestore';
import { create } from 'zustand';

import { atualizarCampos, criarFicha, ouvirFicha } from '@/services/fichas';
import { atualizarCamposLocal, criarFichaLocal, ouvirFichasLocais } from '@/services/fichasLocal';
import { Ficha } from '@/types/ficha';
import { DadosCriacao, montarFicha } from '@/utils/montarFicha';

import { LOCAL_GUEST_UID } from './useAuthStore';

const FLUSH_MS = 350;

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

/** Cópia imutável com valor alterado no caminho pontilhado (só clona o ramo afetado). */
function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const src = (obj ?? {}) as Record<string, unknown>;
  return {
    ...src,
    [head]: rest.length ? setPath(src[head], rest.join('.'), value) : value,
  } as T;
}

interface FichaState {
  ficha: Ficha | null;
  readOnly: boolean;
  loading: boolean;
  error: string | null;
  open: (id: string, uid: string) => void;
  close: () => void;
  /** Compila os dados do assistente, grava no Firestore (ou local no modo convidado) e devolve o id da nova ficha. */
  criar: (uid: string, email: string, dados: DadosCriacao) => Promise<string>;
  /** Atualiza otimisticamente na UI e envia ao Firestore/AsyncStorage com debounce. */
  set: (path: string, value: unknown) => void;
}

let unsub: Unsubscribe | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: Record<string, unknown> = {};

export const useFichaStore = create<FichaState>((set, get) => {
  const flush = async () => {
    timer = null;
    const f = get().ficha;
    if (!f || get().readOnly || !Object.keys(pending).length) return;
    const batch = pending;
    pending = {};
    try {
      if (f.id.startsWith('local-')) {
        await atualizarCamposLocal(f.id, batch);
      } else {
        await atualizarCampos(f.id, batch);
      }
    } catch (e) {
      pending = { ...batch, ...pending }; // tenta de novo na próxima edição
      set({ error: (e as Error).message });
    }
  };

  return {
    ficha: null,
    readOnly: false,
    loading: true,
    error: null,

    open: (id, uid) => {
      unsub?.();
      pending = {};
      set({ ficha: null, loading: true, error: null });

      if (id.startsWith('local-') || uid === LOCAL_GUEST_UID) {
        unsub = ouvirFichasLocais((lista) => {
          const remota = lista.find((x) => x.id === id) ?? null;
          if (!remota) return set({ ficha: null, loading: false, error: 'Ficha não encontrada.' });
          let merged = remota;
          for (const [p, v] of Object.entries(pending)) merged = setPath(merged, p, v);
          set({ ficha: merged, readOnly: false, loading: false, error: null });
        });
        return;
      }

      unsub = ouvirFicha(
        id,
        (remota) => {
          if (!remota) return set({ ficha: null, loading: false, error: 'Ficha não encontrada.' });
          // Reaplica edições locais ainda não enviadas, para o listener não "piscar" valores antigos
          let merged = remota;
          for (const [p, v] of Object.entries(pending)) merged = setPath(merged, p, v);
          set({ ficha: merged, readOnly: remota.ownerId !== uid, loading: false, error: null });
        },
        (e) => set({ loading: false, error: e.message }),
      );
    },

    criar: (uid, email, dados) => {
      const docFicha = montarFicha(uid, email, dados);
      if (uid === LOCAL_GUEST_UID) return criarFichaLocal(docFicha);
      return criarFicha(docFicha);
    },

    close: () => {
      if (timer) {
        clearTimeout(timer);
        void flush();
      }
      unsub?.();
      unsub = null;
      set({ ficha: null, loading: true });
    },

    set: (path, value) => {
      const { ficha, readOnly } = get();
      if (!ficha || readOnly) return;
      pending[path] = value;
      set({ ficha: setPath(ficha, path, value) });
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, FLUSH_MS);
    },
  };
});

/** Assina apenas um campo: o componente só re-renderiza quando ele muda. */
export function useField<T>(path: string): T {
  return useFichaStore((s) => getPath(s.ficha, path)) as T;
}

export const setField = (path: string, value: unknown) => useFichaStore.getState().set(path, value);

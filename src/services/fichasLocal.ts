import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ficha } from '@/types/ficha';
import { uid as genUid } from '@/utils/calc';

const KEY = 'guest:fichas:v1';
type Listener = (fichas: Ficha[]) => void;
const listeners = new Set<Listener>();

export async function lerFichasLocais(): Promise<Ficha[]> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Ficha[];
  } catch {
    return [];
  }
}

async function salvarFichasLocais(lista: Ficha[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(lista));
  listeners.forEach((cb) => cb(lista));
}

export function ouvirFichasLocais(cb: Listener): () => void {
  listeners.add(cb);
  void lerFichasLocais().then(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function criarFichaLocal(dados: Omit<Ficha, 'id'>): Promise<string> {
  const lista = await lerFichasLocais();
  const id = 'local-' + genUid();
  const nova: Ficha = { ...dados, id };
  await salvarFichasLocais([nova, ...lista]);
  return id;
}

export async function atualizarCamposLocal(id: string, campos: Record<string, unknown>) {
  const lista = await lerFichasLocais();
  const idx = lista.findIndex((f) => f.id === id);
  if (idx === -1) return;
  let alvo: unknown = { ...lista[idx], updatedAt: Date.now() };
  for (const [path, val] of Object.entries(campos)) {
    alvo = setPath(alvo, path, val);
  }
  const novaLista = [...lista];
  novaLista[idx] = alvo as Ficha;
  await salvarFichasLocais(novaLista);
}

export async function excluirFichaLocal(id: string) {
  const lista = await lerFichasLocais();
  await salvarFichasLocais(lista.filter((f) => f.id !== id));
}

function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const src = (obj ?? {}) as Record<string, unknown>;
  return {
    ...src,
    [head]: rest.length ? setPath(src[head], rest.join('.'), value) : value,
  } as T;
}

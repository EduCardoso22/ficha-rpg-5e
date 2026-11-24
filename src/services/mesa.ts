import { doc, getDoc, onSnapshot, setDoc, Unsubscribe } from 'firebase/firestore';

import { db } from './firebase';

export interface RolagemMesa {
  id: string;
  personagem: string;
  titulo: string;
  formula: string;
  total: number;
  critico: 'sucesso' | 'falha' | null;
  timestamp: number;
}

export interface IniciativaItem {
  id: string;
  nome: string;
  valor: number;
  pv?: string;
}

export interface DadosMesa {
  codigo: string;
  turnoIdx: number;
  iniciativas: IniciativaItem[];
  rolagens: RolagemMesa[];
  updatedAt: number;
}

export function ouvirMesa(
  codigoRaw: string,
  cb: (dados: DadosMesa) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const codigo = codigoRaw.trim().toUpperCase();
  const ref = doc(db, 'mesas', codigo);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        cb(snap.data() as DadosMesa);
      } else {
        const inicial: DadosMesa = {
          codigo,
          turnoIdx: 0,
          iniciativas: [],
          rolagens: [],
          updatedAt: Date.now(),
        };
        void setDoc(ref, inicial).catch(() => {});
        cb(inicial);
      }
    },
    onError,
  );
}

export async function registrarRolagemNaMesa(codigoRaw: string, rolagem: RolagemMesa, ehIniciativa?: boolean) {
  const codigo = codigoRaw.trim().toUpperCase();
  const ref = doc(db, 'mesas', codigo);
  try {
    const snap = await getDoc(ref);
    const atual: DadosMesa = snap.exists()
      ? (snap.data() as DadosMesa)
      : { codigo, turnoIdx: 0, iniciativas: [], rolagens: [], updatedAt: Date.now() };

    const rolagens = [rolagem, ...(atual.rolagens ?? [])].slice(0, 25);
    let iniciativas = [...(atual.iniciativas ?? [])];

    if (ehIniciativa) {
      const idx = iniciativas.findIndex((i) => i.nome.toLowerCase() === rolagem.personagem.toLowerCase());
      const item: IniciativaItem = {
        id: idx >= 0 ? iniciativas[idx].id : rolagem.id,
        nome: rolagem.personagem,
        valor: rolagem.total,
      };
      if (idx >= 0) iniciativas[idx] = item;
      else iniciativas.push(item);
      iniciativas = iniciativas.sort((a, b) => b.valor - a.valor);
    }

    await setDoc(ref, { ...atual, rolagens, iniciativas, updatedAt: Date.now() });
  } catch {
    // Ignora falha silenciosamente se offline
  }
}

export async function atualizarIniciativasMesa(
  codigoRaw: string,
  iniciativas: IniciativaItem[],
  turnoIdx: number,
) {
  const codigo = codigoRaw.trim().toUpperCase();
  const ref = doc(db, 'mesas', codigo);
  const snap = await getDoc(ref);
  const atual: DadosMesa = snap.exists()
    ? (snap.data() as DadosMesa)
    : { codigo, turnoIdx: 0, iniciativas: [], rolagens: [], updatedAt: Date.now() };
  await setDoc(ref, {
    ...atual,
    iniciativas: [...iniciativas].sort((a, b) => b.valor - a.valor),
    turnoIdx,
    updatedAt: Date.now(),
  });
}

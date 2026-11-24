import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from './firebase';

export type PapelMesa = 'jogador' | 'mestre' | 'ambos';

export interface AmigoRef {
  uid: string;
  email: string;
  apelido: string;
  avatar: string;
  fotoUrl?: string;
  papel: PapelMesa;
  classeFavorita?: string;
  bio?: string;
  codigoAmigo?: string;
  mesaAtual?: string;
  amizadeId?: string;
}

export interface PerfilUsuario {
  uid: string;
  email: string;
  emailLower: string;
  codigoAmigo: string;
  apelido: string;
  avatar: string;
  fotoUrl?: string;
  papel: PapelMesa;
  classeFavorita: string;
  bio: string;
  mesaAtual?: string;
  updatedAt: number;
}

export interface AmizadeDoc {
  id: string;
  uids: string[];
  fromUid: string;
  toUid: string;
  fromPerfil: AmigoRef;
  toPerfil: AmigoRef;
  status: 'pending' | 'accepted';
  createdAt: number;
  updatedAt: number;
}

export const AVATARES_RPG: { id: string; icon: string }[] = [
  { id: 'dice', icon: 'dice-outline' },
  { id: 'sparkles', icon: 'sparkles' },
  { id: 'shield', icon: 'shield-half' },
  { id: 'flame', icon: 'flame' },
  { id: 'paw', icon: 'paw' },
  { id: 'skull', icon: 'skull' },
  { id: 'musical-notes', icon: 'musical-notes' },
  { id: 'flask', icon: 'flask' },
  { id: 'eye', icon: 'eye' },
  { id: 'compass', icon: 'compass' },
];

export function gerarCodigoAmigo(uid: string): string {
  const clean = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const sufixo = clean.slice(0, 5) || 'D205E';
  return `D20-${sufixo}`;
}

export function criarPerfilPadrao(uid: string, email: string): PerfilUsuario {
  const nomeBase = email ? email.split('@')[0] : 'Aventureiro';
  return {
    uid,
    email,
    emailLower: email.trim().toLowerCase(),
    codigoAmigo: gerarCodigoAmigo(uid),
    apelido: nomeBase,
    avatar: 'dice',
    papel: 'jogador',
    classeFavorita: '',
    bio: '',
    updatedAt: Date.now(),
  };
}

/** Remove propriedades com valor undefined para evitar erro do Firestore (Unsupported field value: undefined). */
function limparUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = limparUndefined(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function perfilParaAmigoRef(p: PerfilUsuario): AmigoRef {
  return limparUndefined({
    uid: p.uid,
    email: p.email ?? '',
    apelido: p.apelido || p.email?.split('@')[0] || 'Aventureiro',
    avatar: p.avatar || 'dice',
    ...(p.fotoUrl ? { fotoUrl: p.fotoUrl } : {}),
    papel: p.papel || 'jogador',
    ...(p.classeFavorita ? { classeFavorita: p.classeFavorita } : {}),
    ...(p.bio ? { bio: p.bio } : {}),
    ...(p.codigoAmigo ? { codigoAmigo: p.codigoAmigo } : {}),
    ...(p.mesaAtual ? { mesaAtual: p.mesaAtual } : {}),
  });
}

const STORAGE_KEY_PREFIX = 'ficha5e:perfil:v1:';

export async function carregarPerfilLocal(uid: string, email: string): Promise<PerfilUsuario> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + uid);
    if (raw) {
      const parsed = JSON.parse(raw) as PerfilUsuario;
      return {
        ...criarPerfilPadrao(uid, email),
        ...parsed,
        uid,
        email: email || parsed.email,
        emailLower: (email || parsed.email || '').trim().toLowerCase(),
        codigoAmigo: parsed.codigoAmigo || gerarCodigoAmigo(uid),
      };
    }
  } catch {
    // fallback
  }
  return criarPerfilPadrao(uid, email);
}

export async function salvarPerfil(perfil: PerfilUsuario): Promise<void> {
  const atualizado = limparUndefined<PerfilUsuario>({
    ...perfil,
    emailLower: (perfil.email || '').trim().toLowerCase(),
    codigoAmigo: (perfil.codigoAmigo || gerarCodigoAmigo(perfil.uid)).toUpperCase(),
    updatedAt: Date.now(),
  });
  await AsyncStorage.setItem(STORAGE_KEY_PREFIX + perfil.uid, JSON.stringify(atualizado)).catch(() => {});
  try {
    await setDoc(doc(db, 'perfis', perfil.uid), atualizado, { merge: true });
  } catch (e) {
    console.warn('Falha ao salvar perfil no Firestore:', e);
  }
}

export function escutarMeuPerfil(
  uid: string,
  email: string,
  cb: (p: PerfilUsuario) => void,
): () => void {
  let ativo = true;
  carregarPerfilLocal(uid, email).then((local) => {
    if (ativo) cb(local);
  });

  const unsub = onSnapshot(
    doc(db, 'perfis', uid),
    (snap) => {
      if (!ativo) return;
      if (snap.exists()) {
        const remoto = {
          ...criarPerfilPadrao(uid, email),
          ...(snap.data() as Partial<PerfilUsuario>),
          uid,
        };
        AsyncStorage.setItem(STORAGE_KEY_PREFIX + uid, JSON.stringify(remoto)).catch(() => {});
        cb(remoto);
      } else {
        carregarPerfilLocal(uid, email).then((local) => {
          void salvarPerfil(local);
        });
      }
    },
    () => {
      // Sem conexão: usa o perfil local já carregado
    },
  );

  return () => {
    ativo = false;
    unsub();
  };
}

/** Busca um jogador cadastrado pelo E-mail ou Código de Amigo (ex.: D20-ABCDE). */
export async function buscarJogadorPorEmailOuCodigo(termo: string): Promise<AmigoRef | null> {
  const limpo = termo.trim();
  if (!limpo) return null;

  const isCodigo = limpo.toUpperCase().startsWith('D20-');
  const col = collection(db, 'perfis');

  const q = isCodigo
    ? query(col, where('codigoAmigo', '==', limpo.toUpperCase()))
    : query(col, where('emailLower', '==', limpo.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0].data() as PerfilUsuario;
  return perfilParaAmigoRef(d);
}

/** Envia uma solicitação de amizade mútua para outro usuário. */
export async function enviarSolicitacaoAmizade(
  meuPerfil: PerfilUsuario,
  termo: string,
): Promise<{ status: 'sent' | 'auto_accepted' | 'already_friends' | 'not_found'; alvo?: AmigoRef }> {
  const alvo = await buscarJogadorPorEmailOuCodigo(termo);
  if (!alvo) return { status: 'not_found' };

  const pairId = [meuPerfil.uid, alvo.uid].sort().join('_');
  const ref = doc(db, 'amizades', pairId);
  const existente = await getDoc(ref);

  if (existente.exists()) {
    const data = existente.data() as AmizadeDoc;
    if (data.status === 'accepted') {
      return { status: 'already_friends', alvo };
    }
    // Se a outra pessoa já tinha enviado uma solicitação para mim, aceita automaticamente!
    if (data.toUid === meuPerfil.uid) {
      await updateDoc(ref, {
        status: 'accepted',
        toPerfil: perfilParaAmigoRef(meuPerfil),
        updatedAt: Date.now(),
      });
      return { status: 'auto_accepted', alvo };
    }
    return { status: 'sent', alvo };
  }

  const nova: Omit<AmizadeDoc, 'id'> = {
    uids: [meuPerfil.uid, alvo.uid],
    fromUid: meuPerfil.uid,
    toUid: alvo.uid,
    fromPerfil: perfilParaAmigoRef(meuPerfil),
    toPerfil: alvo,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(ref, nova);
  return { status: 'sent', alvo };
}

const AMIZADES_CACHE_PREFIX = 'ficha5e:amizades:v1:';

/** Ouve em tempo real as amizades aceitas e solicitações pendentes (recebidas e enviadas). */
export function escutarMinhasAmizades(
  uid: string,
  cb: (dados: { amigos: AmigoRef[]; recebidas: AmizadeDoc[]; enviadas: AmizadeDoc[] }) => void,
  onError?: (err: Error) => void,
): () => void {
  let ativo = true;
  AsyncStorage.getItem(AMIZADES_CACHE_PREFIX + uid)
    .then((raw) => {
      if (ativo && raw) {
        cb(JSON.parse(raw) as { amigos: AmigoRef[]; recebidas: AmizadeDoc[]; enviadas: AmizadeDoc[] });
      }
    })
    .catch(() => {});

  const q = query(collection(db, 'amizades'), where('uids', 'array-contains', uid));
  const unsub = onSnapshot(
    q,
    (snap) => {
      if (!ativo) return;
      const amigos: AmigoRef[] = [];
      const recebidas: AmizadeDoc[] = [];
      const enviadas: AmizadeDoc[] = [];

      for (const d of snap.docs) {
        const docData = { ...(d.data() as Omit<AmizadeDoc, 'id'>), id: d.id };
        if (docData.status === 'accepted') {
          const outro = docData.fromUid === uid ? docData.toPerfil : docData.fromPerfil;
          amigos.push({ ...outro, amizadeId: d.id });
        } else if (docData.status === 'pending') {
          if (docData.toUid === uid) recebidas.push(docData);
          else enviadas.push(docData);
        }
      }
      const res = { amigos, recebidas, enviadas };
      AsyncStorage.setItem(AMIZADES_CACHE_PREFIX + uid, JSON.stringify(res)).catch(() => {});
      cb(res);
    },
    (err) => {
      if (ativo && onError) onError(err);
    },
  );

  return () => {
    ativo = false;
    unsub();
  };
}

export async function aceitarSolicitacaoAmizade(amizadeId: string, meuPerfil: PerfilUsuario): Promise<void> {
  await updateDoc(doc(db, 'amizades', amizadeId), {
    status: 'accepted',
    toPerfil: perfilParaAmigoRef(meuPerfil),
    updatedAt: Date.now(),
  });
}

export async function recusarOuRemoverAmizade(amizadeId: string): Promise<void> {
  await deleteDoc(doc(db, 'amizades', amizadeId));
}

/** Busca os dados mais recentes de cada amigo diretamente na coleção perfis. */
export async function sincronizarDadosAmigos(amigos: AmigoRef[]): Promise<AmigoRef[]> {
  return Promise.all(
    amigos.map(async (a) => {
      try {
        const snap = await getDoc(doc(db, 'perfis', a.uid));
        if (snap.exists()) {
          const d = snap.data() as PerfilUsuario;
          return { ...perfilParaAmigoRef(d), amizadeId: a.amizadeId };
        }
      } catch {
        // mantém dados atuais
      }
      return a;
    }),
  );
}

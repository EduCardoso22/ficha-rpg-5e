import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';

import { Ficha } from '@/types/ficha';

import { db } from './firebase';

const col = collection(db, 'fichas');

/** Grava uma ficha nova (documento completo) e devolve o id gerado. */
export async function criarFicha(dados: Omit<Ficha, 'id'>) {
  const ref = await addDoc(col, dados);
  return ref.id;
}

export const excluirFicha = (id: string) => deleteDoc(doc(db, 'fichas', id));

/** Listener em tempo real das fichas do usuário. */
export function ouvirMinhasFichas(uid: string, cb: (f: Ficha[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(col, where('ownerId', '==', uid)),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Ficha, 'id'>), id: d.id }))),
    onError,
  );
}

/** Fichas compartilhadas (somente leitura) com o e-mail informado. */
export function ouvirFichasCompartilhadas(email: string, cb: (f: Ficha[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(col, where('sharedWithEmails', 'array-contains', email.toLowerCase())),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Ficha, 'id'>), id: d.id }))),
    onError,
  );
}

/** Listener em tempo real de uma única ficha. */
export function ouvirFicha(id: string, cb: (f: Ficha | null) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'fichas', id),
    (snap) => cb(snap.exists() ? ({ ...(snap.data() as Omit<Ficha, 'id'>), id: snap.id }) : null),
    onError,
  );
}

/**
 * Atualização granular: as chaves são caminhos pontilhados ("pv.atual"),
 * então só os campos alterados trafegam e edições concorrentes não se sobrescrevem.
 */
export const atualizarCampos = (id: string, campos: Record<string, unknown>) =>
  updateDoc(doc(db, 'fichas', id), { ...campos, updatedAt: Date.now() });

export const compartilharCom = (id: string, email: string) =>
  updateDoc(doc(db, 'fichas', id), { sharedWithEmails: arrayUnion(email.trim().toLowerCase()) });

export const removerCompartilhamento = (id: string, email: string) =>
  updateDoc(doc(db, 'fichas', id), { sharedWithEmails: arrayRemove(email) });

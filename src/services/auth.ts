import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

import { LOCAL_GUEST_UID, useAuthStore } from '@/store/useAuthStore';

import { auth, db } from './firebase';

const GUEST_STORAGE_KEY = 'auth:guest-session';

export const observeAuth = (cb: (u: User | null) => void) =>
  onAuthStateChanged(auth, async (u) => {
    if (u) {
      await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
      cb(u);
      return;
    }
    const localGuest = await AsyncStorage.getItem(GUEST_STORAGE_KEY).catch(() => null);
    if (localGuest === '1') {
      useAuthStore.getState().setLocalGuest();
    } else {
      cb(null);
    }
  });

export const signIn = (email: string, senha: string) =>
  signInWithEmailAndPassword(auth, email.trim(), senha);

export const signUp = (email: string, senha: string) =>
  createUserWithEmailAndPassword(auth, email.trim(), senha);

/** Tenta login anônimo no Firebase; se desativado no console ou offline, usa sessão local de convidado. */
export async function signInAsGuest() {
  try {
    await signInAnonymously(auth);
  } catch {
    await AsyncStorage.setItem(GUEST_STORAGE_KEY, '1').catch(() => {});
    useAuthStore.getState().setLocalGuest();
  }
}

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim());

export async function logout() {
  await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
  useAuthStore.getState().setUser(null);
  await signOut(auth).catch(() => {});
}

/**
 * Exclui todos os dados do usuário no Firestore (fichas, amizades e perfil),
 * limpa registros locais e remove a conta do Firebase Auth.
 */
export async function excluirContaCompleta(senha?: string): Promise<void> {
  const storeUser = useAuthStore.getState().user;
  const current = auth.currentUser;
  const uid = current?.uid ?? storeUser?.uid;

  if (!uid) {
    throw new Error('Nenhum usuário autenticado encontrado.');
  }

  // Se houver usuário real no Firebase Auth e senha informada, reautentica antes de apagar o banco
  if (current && !current.isAnonymous && current.email && senha) {
    const cred = EmailAuthProvider.credential(current.email, senha);
    await reauthenticateWithCredential(current, cred);
  }

  // Convidado local (sem Firebase Auth): limpa apenas o armazenamento local
  if (uid === LOCAL_GUEST_UID && !current) {
    await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
    await AsyncStorage.removeItem(`tutorial_visto_${uid}`).catch(() => {});
    useAuthStore.getState().setUser(null);
    return;
  }

  // 1. Apagar todas as fichas do usuário
  const fichasSnap = await getDocs(query(collection(db, 'fichas'), where('ownerId', '==', uid)));
  await Promise.all(fichasSnap.docs.map((d) => deleteDoc(d.ref)));

  // 2. Apagar todas as amizades/solicitações do usuário
  const amizadesSnap = await getDocs(
    query(collection(db, 'amizades'), where('uids', 'array-contains', uid)),
  );
  await Promise.all(amizadesSnap.docs.map((d) => deleteDoc(d.ref)));

  // 3. Apagar perfil do usuário
  await deleteDoc(doc(db, 'perfis', uid)).catch(() => {});

  // 4. Limpar flags locais (ex.: tutorial visto)
  await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
  await AsyncStorage.removeItem(`tutorial_visto_${uid}`).catch(() => {});

  // 5. Excluir conta no Firebase Auth
  if (current) {
    await deleteUser(current);
  }

  useAuthStore.getState().setUser(null);
}

export function traduzErroAuth(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
    return 'E-mail não cadastrado na plataforma.';
  }
  const map: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/weak-password': 'Senha fraca (mínimo 6 caracteres).',
    'auth/network-request-failed': 'Sem conexão com a internet.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/requires-recent-login': 'Por segurança, informe sua senha atual para confirmar a exclusão.',
  };
  return map[code] ?? 'Não foi possível autenticar.';
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';

import { useAuthStore } from '@/store/useAuthStore';

import { auth } from './firebase';

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
  };
  return map[code] ?? 'Não foi possível autenticar.';
}

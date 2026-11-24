import { User } from 'firebase/auth';
import { create } from 'zustand';

export const LOCAL_GUEST_UID = 'guest-local';

export interface AppUser {
  uid: string;
  email: string | null;
  isAnonymous?: boolean;
  isLocalGuest?: boolean;
}

interface AuthState {
  user: AppUser | null;
  ready: boolean;
  setUser: (u: User | null) => void;
  setLocalGuest: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setUser: (u) =>
    set({
      user: u ? { uid: u.uid, email: u.email ?? (u.isAnonymous ? 'Convidado' : null), isAnonymous: u.isAnonymous } : null,
      ready: true,
    }),
  setLocalGuest: () =>
    set({
      user: { uid: LOCAL_GUEST_UID, email: 'Convidado (Local)', isAnonymous: true, isLocalGuest: true },
      ready: true,
    }),
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/api/auth.api';
import { User } from '@/types';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string,
    emailVerificationToken: string
  ) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          set({
            user: response.data.user,
            tokens: response.data.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: unknown) {
          const error = err as Error;
          set({ error: error.message, isLoading: false });
          throw err;
        }
      },

      register: async (
        email: string,
        password: string,
        name: string,
        phone: string,
        emailVerificationToken: string
      ) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(
            email,
            password,
            name,
            phone,
            emailVerificationToken
          );
          set({
            user: response.data.user,
            tokens: response.data.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: unknown) {
          const error = err as Error;
          set({ error: error.message, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({
          tokens: { accessToken, refreshToken },
          isAuthenticated: true,
        });
      },

      fetchUser: async () => {
        try {
          const response = await authApi.getMe();
          set({ user: response.data });
        } catch (err) {
          console.error('Failed to fetch user:', err);
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cubby-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

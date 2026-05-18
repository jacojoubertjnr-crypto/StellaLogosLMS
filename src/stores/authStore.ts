import { create } from 'zustand';
import { apolloClient } from '../lib/apolloClient';
import { gql } from '@apollo/client';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        displayName
        role
        paidStatus
      }
    }
  }
`;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'Admin' | 'Teacher' | 'Learner';
  paidStatus: boolean;
}

interface AuthState {
  username: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  user: AuthUser | null;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  login: () => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  username: '',
  password: '',
  isLoading: false,
  error: null,
  user: null,

  setUsername: (username) => set({ username, error: null }),
  setPassword: (password) => set({ password, error: null }),

  async login() {
    const { username, password } = get();
    set({ isLoading: true, error: null });

    try {
      const { data } = await apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: { email: username, password },
      });

      const { token, user } = data.login;
      sessionStorage.setItem('sl_token', token);
      set({ user, isLoading: false, password: '' });
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout() {
    sessionStorage.removeItem('sl_token');
    apolloClient.clearStore();
    set({ user: null, username: '', password: '', error: null });
  },
}));

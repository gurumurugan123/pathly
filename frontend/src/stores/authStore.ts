import { create } from 'zustand';
import type { User } from '../types';
import { getAuthToken, setAuthToken, removeAuthToken, apiRequest } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getAuthToken(),
  isAuthenticated: !!getAuthToken(),
  isLoading: true,

  login: async (username: string, password: string) => {
    const data = await apiRequest<{ user: User; access: string; refresh: string }>('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthToken(data.access);
    set({
      user: data.user || { id: 1, username, email: '' },
      token: data.access,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  register: async (registerData: any) => {
    const data = await apiRequest<{ user: User; access: string; refresh: string }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(registerData),
    });
    setAuthToken(data.access);
    set({
      user: data.user,
      token: data.access,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    removeAuthToken();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const user = await apiRequest<User>('/auth/me/');
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      removeAuthToken();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

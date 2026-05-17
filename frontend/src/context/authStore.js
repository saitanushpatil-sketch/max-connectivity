import { create } from 'zustand';
import api from '../utils/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  init: async () => {
    if (typeof window === 'undefined') { set({ isLoading: false }); return; }
    const token = localStorage.getItem('max_token');
    const cached = localStorage.getItem('max_user');
    if (!token) { set({ isLoading: false }); return; }
    // Optimistically set cached user, then verify
    if (cached) {
      try { set({ user: JSON.parse(cached), token, isAuthenticated: true }); } catch (_) {}
    }
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('max_user', JSON.stringify(data.user));
      set({ user: data.user, token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('max_token');
      localStorage.removeItem('max_user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('max_token', data.token);
    localStorage.setItem('max_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data.user;
  },

  signup: async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    localStorage.setItem('max_token', data.token);
    localStorage.setItem('max_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data.user;
  },

  setGoogleSession: (token, user) => {
    localStorage.setItem('max_token', token);
    localStorage.setItem('max_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('max_token');
    localStorage.removeItem('max_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) => {
    const updated = { ...get().user, ...updates };
    localStorage.setItem('max_user', JSON.stringify(updated));
    set({ user: updated });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export default useAuthStore;

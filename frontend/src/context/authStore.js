import { create } from 'zustand';
import api, { getTokenFromCookie, setToken, clearToken } from '../utils/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  init: async () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    let token = getTokenFromCookie() || localStorage.getItem('max_token');
    if (token) setToken(token);

    const cached = localStorage.getItem('max_user');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    if (cached) {
      try {
        set({ user: JSON.parse(cached), token, isAuthenticated: true, isLoading: true });
      } catch {
        set({ token, isLoading: true });
      }
    } else {
      set({ token, isLoading: true });
    }

    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('max_user', JSON.stringify(data.user));
      set({ user: data.user, token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      if (err.response?.status === 401) {
        clearToken();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      } else {
        set({ token, isLoading: false });
      }
    }
  },

  sendLoginOtp: async (email) => {
    const { data } = await api.post('/auth/login-otp', { email });
    return data;
  },

  verifyLoginOtp: async (email, code) => {
    const { data } = await api.post('/auth/login-verify', { email, code });
    setToken(data.token);
    localStorage.setItem('max_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data.user;
  },

  sendSignupOtp: async (email) => {
    const { data } = await api.post('/auth/send-otp', { email });
    return data;
  },

  verifySignupOtp: async (email, code) => {
    const { data } = await api.post('/auth/verify-otp', { email, code });
    return data;
  },

  signup: async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    setToken(data.token);
    localStorage.setItem('max_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data.user;
  },

  setGoogleSession: (token, user) => {
    setToken(token);
    localStorage.setItem('max_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    clearToken();
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

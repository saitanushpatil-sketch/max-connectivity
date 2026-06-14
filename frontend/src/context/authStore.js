import { create } from 'zustand';
import api, { getTokenFromCookie, setToken, clearToken } from '../utils/api';

// Generate a stable device fingerprint
function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  
  // Check if we already have one stored
  const stored = localStorage.getItem('max_device_id');
  if (stored) return stored;
  
  // Generate from device characteristics
  const parts = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency || 0,
    new Date().getTimezoneOffset(),
  ];
  
  // Simple hash
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const deviceId = 'dev_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
  localStorage.setItem('max_device_id', deviceId);
  return deviceId;
}

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
    const token = getTokenFromCookie() || localStorage.getItem('max_token');
    if (token) setToken(token);
    const cached = localStorage.getItem('max_user');
    
    if (!token) {
      set({ isLoading: false });
      return;
    }
    
    // Show cached user INSTANTLY
    if (cached) {
      try {
        const user = JSON.parse(cached);
        set({ 
          user, token, 
          isAuthenticated: true,
          isLoading: false  // Don't block!
        });
      } catch (_) {}
    }
    
    // Verify in background silently
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('max_user', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      // Token invalid or device conflict — logout
      if (err.response?.status === 401) {
        clearToken();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      } else {
        set({ token, isLoading: false });
      }
    }
  },

  // Owner-only passphrase login
  ownerLogin: async (passphrase) => {
    const deviceId = getDeviceId();
    const { data } = await api.post('/auth/owner-login', { passphrase, deviceId });
    setToken(data.token);
    localStorage.setItem('max_user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data.user;
  },

  // Legacy methods — kept for compatibility
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

  logout: async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {} finally {
      clearToken();
      localStorage.removeItem('max_user');
      // Disconnect socket
      try {
        const { getSocket } = require('../hooks/useSocket');
        const socket = getSocket();
        if (socket) socket.disconnect();
      } catch {}
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  updateUser: (updates) => {
    const updated = { ...get().user, ...updates };
    localStorage.setItem('max_user', JSON.stringify(updated));
    set({ user: updated });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export { getDeviceId };
export default useAuthStore;

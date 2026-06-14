import { create } from 'zustand';
import { firebaseSignOut, onAuthChange, auth } from '../lib/firebase';
import api from '../utils/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,

  // Called after Firebase auth — sync with our backend
  loginWithFirebase: async (firebaseToken, firebaseUser) => {
    try {
      // Send Firebase token to our backend to get/create user
      const res = await api.post('/auth/firebase', {
        firebaseToken,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        uid: firebaseUser.uid,
      });

      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    } catch (err) {
      console.error('Backend sync error:', err);
      throw err;
    }
  },

  // Initialize auth state from Firebase + localStorage
  init: () => {
    // First check localStorage for immediate hydration
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      set({ user: JSON.parse(savedUser), token: savedToken, isAuthenticated: true, loading: false });
    }

    // Then listen to Firebase auth state
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Refresh token
          const freshToken = await firebaseUser.getIdToken(true);
          const res = await api.post('/auth/firebase', {
            firebaseToken: freshToken,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            uid: firebaseUser.uid,
          });
          const { token, user } = res.data;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          set({ user, token, isAuthenticated: true, loading: false });
        } catch {
          set({ loading: false });
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false, loading: false });
      }
    });

    return unsubscribe;
  },

  logout: async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) await api.post('/auth/logout');
      await firebaseSignOut();
    } catch {} finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;

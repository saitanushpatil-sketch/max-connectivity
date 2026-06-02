import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'max_token';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export function getTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${TOKEN_KEY}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(TOKEN_KEY.length + 1));
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return getTokenFromCookie() || localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined' || !token) return;
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('max_user');
  document.cookie = `${TOKEN_KEY}=; max-age=0; path=/; SameSite=Lax`;
}

export function hasStoredToken() {
  if (typeof window === 'undefined') return false;
  return !!(getTokenFromCookie() || localStorage.getItem(TOKEN_KEY));
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window === 'undefined') {
      return Promise.reject(error);
    }
    // Auto-logout on device conflict or expired session
    if (error.response?.status === 401) {
      const code = error.response?.data?.code;
      if (code === 'DEVICE_CONFLICT') {
        clearToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?error=' + encodeURIComponent('Session ended — logged in on another device');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Log 429 responses for debugging
    if (response.status === 429) {
      console.error(`[FRONTEND 429] ${response.config?.method?.toUpperCase()} ${response.config?.url} | Status: 429 | Retry-After: ${response.headers?.['retry-after'] || 'none'}`);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 429) {
      console.error(`[FRONTEND 429 ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url} | Status: 429 | Message: ${error.response?.data?.message || error.message} | Retry-After: ${error.response?.headers?.['retry-after'] || 'none'}`);
    } else if (error.response?.status >= 500) {
      console.error(`[FRONTEND ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url} | Status: ${error.response?.status} | Message: ${error.response?.data?.message || error.message}`);
    }
    
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

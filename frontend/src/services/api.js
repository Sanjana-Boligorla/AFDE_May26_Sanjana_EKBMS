import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,   // 10 second timeout - fails fast if backend is down
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ekbms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.code === 'ECONNABORTED') {
      err.message = 'Request timed out. Is the backend running?';
    }
    if (!err.response) {
      err.message = 'Cannot reach server. Check that the backend is running on port 8000.';
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('ekbms_token');
      localStorage.removeItem('ekbms_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

import api from './api';
export const login           = (data)  => api.post('/auth/login', data);
export const register        = (data)  => api.post('/auth/register', data);
export const getMe           = ()      => api.get('/auth/me');
export const updateProfile   = (data)  => api.put('/auth/me', data);
export const changePassword  = (data)  => api.put('/auth/change-password', data);

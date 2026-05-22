import api from './api';
const userService = {
  getUsers:       (params)      => api.get('/users', { params }),
  getUser:        (id)          => api.get(`/users/${id}`),
  createUser:     (data)        => api.post('/users', data),
  updateUser:     (id, data)    => api.put(`/users/${id}`, data),
  updateUserRole: (id, role_id) => api.put(`/users/${id}/role`, { role_id }),
  toggleUser:     (id)          => api.put(`/users/${id}/toggle`),
  getRoles:       ()            => api.get('/users/roles'),
};
export const { getUsers, getUser, createUser, updateUser, updateUserRole, toggleUser, getRoles } = userService;
export default userService;

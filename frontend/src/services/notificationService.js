import api from './api';
const notificationService = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markRead:         (id)      => api.put(`/notifications/${id}/read`),
  markAllRead:      ()        => api.put('/notifications/read-all'),
};
export const { getNotifications, markRead, markAllRead } = notificationService;
export default notificationService;

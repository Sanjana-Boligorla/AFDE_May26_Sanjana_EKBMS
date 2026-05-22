import api from './api';
const tagService = {
  getTags:   (params)   => api.get('/tags', { params }),
  getTag:    (id)       => api.get(`/tags/${id}`),
  createTag: (data)     => api.post('/tags', data),
  updateTag: (id, data) => api.put(`/tags/${id}`, data),
  deleteTag: (id)       => api.delete(`/tags/${id}`),
};
export const { getTags, getTag, createTag, updateTag, deleteTag } = tagService;
export default tagService;

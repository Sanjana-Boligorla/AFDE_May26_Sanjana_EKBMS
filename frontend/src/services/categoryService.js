import api from './api';
const categoryService = {
  getCategories:  (params)   => api.get('/categories', { params }),
  getCategory:    (id)       => api.get(`/categories/${id}`),
  createCategory: (data)     => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id)       => api.delete(`/categories/${id}`),
};
export const { getCategories, getCategory, createCategory, updateCategory, deleteCategory } = categoryService;
export default categoryService;

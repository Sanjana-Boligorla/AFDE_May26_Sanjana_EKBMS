import api from './api';
const articleService = {
  getArticles:     (params)    => api.get('/articles', { params }),
  getMyArticles:   (params)    => api.get('/articles/my', { params }),
  getArticle:      (slug)      => api.get(`/articles/${slug}`),
  getArticleById:  (id)        => api.get(`/articles/${id}`),
  createArticle:   (data)      => api.post('/articles', data),
  updateArticle:   (id, data)  => api.put(`/articles/${id}`, data),
  deleteArticle:   (id)        => api.delete(`/articles/${id}`),
  submitForReview: (id, data)  => api.post(`/articles/${id}/submit`, data),
  publishArticle:  (id)        => api.post(`/articles/${id}/publish`),
  archiveArticle:  (id)        => api.post(`/articles/${id}/archive`),
  getVersions:     (id)        => api.get(`/articles/${id}/versions`),
  rateArticle:     (id, rating) => api.post(`/ratings/article/${id}`, { rating }),
};
export const {
  getArticles, getMyArticles, getArticle, getArticleById,
  createArticle, updateArticle, deleteArticle,
  submitForReview, publishArticle, archiveArticle, getVersions, rateArticle
} = articleService;
export default articleService;

import api from './api';
const commentService = {
  getComments:   (articleId)       => api.get(`/comments/article/${articleId}`),
  addComment:    (articleId, data) => api.post(`/comments/article/${articleId}`, data),
  updateComment: (id, data)        => api.put(`/comments/${id}`, data),
  deleteComment: (id)              => api.delete(`/comments/${id}`),
};
export const { getComments, addComment, updateComment, deleteComment } = commentService;
export default commentService;

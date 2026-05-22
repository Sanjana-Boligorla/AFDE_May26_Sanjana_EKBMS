import api from './api';
const bookmarkService = {
  getBookmarks:       (params)    => api.get('/bookmarks', { params }),
  addBookmark:        (articleId) => api.post(`/bookmarks/${articleId}`),
  removeBookmark:     (articleId) => api.delete(`/bookmarks/${articleId}`),
  removeBookmarkById: (id)        => api.delete(`/bookmarks/${id}`),
  checkBookmark:      (articleId) => api.get(`/bookmarks/check/${articleId}`),
};
export const { getBookmarks, addBookmark, removeBookmark, removeBookmarkById, checkBookmark } = bookmarkService;
export default bookmarkService;

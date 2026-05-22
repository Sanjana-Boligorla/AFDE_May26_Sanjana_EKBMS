import api from './api';
const searchService = {
  search:         (params) => api.get('/search', { params }),
  getSuggestions: (q)      => api.get('/search/suggestions', { params: { q } }),
};
export const { search, getSuggestions } = searchService;
export default searchService;

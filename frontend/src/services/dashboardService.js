import api from './api';
const dashboardService = {
  getStats:           () => api.get('/dashboard/stats'),
  getPopularArticles: () => api.get('/dashboard/popular'),
  getRecentArticles:  () => api.get('/dashboard/recent'),
  getPendingApprovals:() => api.get('/dashboard/pending'),
  getCategoryStats:   () => api.get('/dashboard/category-stats'),
};
export const {
  getStats, getPopularArticles, getRecentArticles, getPendingApprovals, getCategoryStats
} = dashboardService;
export default dashboardService;

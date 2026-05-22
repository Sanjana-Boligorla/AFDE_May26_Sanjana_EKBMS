import api from './api';

const analyticsService = {
  getOverview:       (params) => api.get('/analytics/overview',        { params }),
  getViewsOverTime:  (params) => api.get('/analytics/views',           { params }),
  getTopArticles:    (params) => api.get('/analytics/top-articles',    { params }),
  getCategoryStats:  (params) => api.get('/analytics/categories',      { params }),
  getSearchKeywords: (params) => api.get('/analytics/search-keywords', { params }),
  getAuthorActivity: (params) => api.get('/analytics/authors',         { params }),
  getEvents:         (params) => api.get('/analytics/events',          { params }),
  trackEvent:        (data)   => api.post('/analytics/track',         data),
  trackSearch:       (data)   => api.post('/analytics/search-track',  data),
};

export default analyticsService;

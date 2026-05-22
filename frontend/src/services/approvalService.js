import api from './api';
const approvalService = {
  getApprovals:    (params)   => api.get('/approvals', { params }),
  approveArticle:  (id, data) => api.put(`/approvals/${id}/approve`, data),
  rejectArticle:   (id, data) => api.put(`/approvals/${id}/reject`, data),
  requestRevision: (id, data) => api.put(`/approvals/${id}/revision`, data),
  assignReviewer:  (id, data) => api.put(`/approvals/${id}/assign`, data),
};
export const { getApprovals, approveArticle, rejectArticle, requestRevision, assignReviewer } = approvalService;
export default approvalService;

import api from './api';

const etlService = {
  triggerJob:    (formData) => api.post('/etl/run',         formData,
                                { headers: { 'Content-Type': 'multipart/form-data' } }),
  runDefault:    ()         => api.post('/etl/run',         { use_default: 'true' }),
  triggerRollup: ()         => api.post('/etl/rollup'),
  listJobs:      (params)   => api.get('/etl/jobs',         { params }),
  getJob:        (id)       => api.get(`/etl/jobs/${id}`),
  cancelJob:     (id)       => api.delete(`/etl/jobs/${id}`),
};

export default etlService;

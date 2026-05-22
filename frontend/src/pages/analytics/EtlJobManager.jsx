import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import etlService from '../../services/etlService';
import Spinner from '../../components/common/Spinner';
import { timeAgo } from '../../utils/helpers';

const STATUS_STYLES = {
  pending:   'bg-gray-100   text-gray-600',
  running:   'bg-blue-100   text-blue-700',
  completed: 'bg-green-100  text-green-700',
  failed:    'bg-red-100    text-red-700',
  cancelled: 'bg-yellow-100 text-yellow-700',
};

const LOG_STYLES = {
  info:  'text-gray-700',
  warn:  'text-amber-600',
  error: 'text-red-600',
  debug: 'text-gray-400',
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function RunningDot() {
  return <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1" />;
}

export default function EtlJobManager() {
  const [jobs, setJobs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [triggering, setTriggering]   = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [logs, setLogs]               = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [file, setFile]               = useState(null);
  const [jobName, setJobName]         = useState('');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState({});
  const pollRef                       = useRef(null);
  const logsEndRef                    = useRef(null);

  const fetchJobs = useCallback(async (pg = 1) => {
    try {
      const res = await etlService.listJobs({ page: pg, limit: 15 });
      setJobs(Array.isArray(res.data?.data) ? res.data.data : []);
      setPagination(res.data?.pagination || {});
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(page); }, [fetchJobs, page]);

  // Poll running jobs every 3s
  useEffect(() => {
    const hasRunning = jobs.some(j => j.status === 'running' || j.status === 'pending');
    if (hasRunning) {
      pollRef.current = setTimeout(() => fetchJobs(page), 3000);
    }
    return () => clearTimeout(pollRef.current);
  }, [jobs, fetchJobs, page]);

  const openJob = async (job) => {
    setSelectedJob(job);
    setLogsLoading(true);
    try {
      const res = await etlService.getJob(job.id);
      const detail = res.data?.data?.job;
      setSelectedJob(detail || job);
      setLogs(res.data?.data?.logs || []);
    } catch {
      toast.error('Failed to load job details');
    } finally {
      setLogsLoading(false);
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const runDefault = async () => {
    setTriggering(true);
    try {
      const res = await etlService.runDefault();
      toast.success(`ETL job #${res.data?.data?.job_id} started`);
      await fetchJobs(1);
      setPage(1);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to start ETL job');
    } finally {
      setTriggering(false);
    }
  };

  const runUpload = async () => {
    if (!file) return toast.error('Select a CSV or JSON file first');
    setTriggering(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (jobName) fd.append('job_name', jobName);
      const res = await etlService.triggerJob(fd);
      toast.success(`ETL job #${res.data?.data?.job_id} started`);
      setFile(null);
      setJobName('');
      await fetchJobs(1);
      setPage(1);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to start ETL job');
    } finally {
      setTriggering(false);
    }
  };

  const rollup = async () => {
    try {
      await etlService.triggerRollup();
      toast.success('Analytics rollup completed');
    } catch {
      toast.error('Rollup failed');
    }
  };

  const cancelJob = async (id) => {
    try {
      await etlService.cancelJob(id);
      toast.success('Job cancelled');
      fetchJobs(page);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not cancel');
    }
  };

  const durationStr = (job) => {
    if (!job.started_at) return '—';
    const end = job.completed_at ? new Date(job.completed_at) : new Date();
    const secs = Math.round((end - new Date(job.started_at)) / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">ETL Job Manager</h1>
        <p className="text-sm text-gray-500 mt-1">Import articles and manage data pipeline jobs</p>
      </div>

      {/* Trigger panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Default dataset import */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Import Built-in Dataset</h3>
          <p className="text-xs text-gray-500 mb-4">Load the 120-article sample dataset (articles_dataset.csv)</p>
          <button onClick={runDefault} disabled={triggering}
            className="btn-primary w-full justify-center">
            {triggering ? <Spinner size="sm" /> : '▶ Run Default Import'}
          </button>
        </div>

        {/* Upload custom file */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Upload Custom File</h3>
          <p className="text-xs text-gray-500 mb-3">CSV or JSON — max 10 MB</p>
          <div className="space-y-2">
            <input type="text" placeholder="Job name (optional)"
              value={jobName} onChange={e => setJobName(e.target.value)}
              className="input text-sm w-full" />
            <label className="block">
              <span className="sr-only">Choose file</span>
              <input type="file" accept=".csv,.json"
                onChange={e => setFile(e.target.files[0])}
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
            </label>
            {file && <p className="text-xs text-gray-500 truncate">📎 {file.name}</p>}
            <button onClick={runUpload} disabled={triggering || !file}
              className="btn-primary w-full justify-center mt-1">
              {triggering ? <Spinner size="sm" /> : '⬆ Upload & Import'}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics rollup */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-800 text-sm">Analytics Rollup</p>
          <p className="text-xs text-gray-500">Compute today's daily content_analytics aggregates</p>
        </div>
        <button onClick={rollup} className="btn-ghost text-sm border border-gray-200">
          🔄 Run Rollup
        </button>
      </div>

      {/* Job history table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Job History</h2>
          <button onClick={() => fetchJobs(page)} className="btn-ghost text-sm text-gray-500">↻ Refresh</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : jobs.length === 0 ? (
          <p className="text-center py-12 text-gray-400">No jobs yet — run your first import above</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['#','Name / Type','Status','Records','Duration','Triggered','Actions'].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 text-xs">#{job.id}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800 max-w-xs truncate">{job.job_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{job.job_type.replace('_',' ')}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1">
                        {job.status === 'running' && <RunningDot />}
                        <StatusBadge status={job.status} />
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-green-600 font-medium">{job.records_processed}</span>
                      <span className="text-gray-400"> / {job.records_total}</span>
                      {job.records_failed > 0 && (
                        <span className="text-red-500 ml-1">({job.records_failed} err)</span>
                      )}
                      {job.records_skipped > 0 && (
                        <span className="text-gray-400 ml-1">({job.records_skipped} skip)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{durationStr(job)}</td>
                    <td className="py-3 px-4">
                      <p className="text-gray-600">{job.triggered_by_name || 'System'}</p>
                      <p className="text-xs text-gray-400">{timeAgo(job.created_at)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={() => openJob(job)}
                          className="text-xs text-indigo-600 hover:underline font-medium">
                          Logs
                        </button>
                        {job.status === 'pending' && (
                          <button onClick={() => cancelJob(job.id)}
                            className="text-xs text-red-500 hover:underline">
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="btn-ghost text-sm disabled:opacity-40">← Prev</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
                className="btn-ghost text-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Job detail / logs drawer */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelectedJob(null)}>
          <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Drawer header */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{selectedJob.job_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={selectedJob.status} />
                  <span className="text-xs text-gray-400 capitalize">{selectedJob.job_type?.replace('_',' ')}</span>
                </div>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-px bg-gray-100 border-b border-gray-100">
              {[
                { label: 'Total',     value: selectedJob.records_total     },
                { label: 'Processed', value: selectedJob.records_processed, cls: 'text-green-600' },
                { label: 'Failed',    value: selectedJob.records_failed,    cls: 'text-red-600'   },
                { label: 'Skipped',   value: selectedJob.records_skipped,   cls: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="bg-white p-3 text-center">
                  <p className={`text-lg font-bold ${s.cls || 'text-gray-800'}`}>{s.value ?? 0}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-gray-950">
              {logsLoading ? (
                <div className="flex justify-center py-8"><Spinner size="sm" /></div>
              ) : logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No logs available</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`mb-0.5 ${LOG_STYLES[log.level] || 'text-gray-300'}`}>
                    <span className="text-gray-600 mr-2">
                      {new Date(log.created_at).toISOString().slice(11, 19)}
                    </span>
                    <span className={`mr-2 uppercase text-xs font-bold ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn'  ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>[{log.level}]</span>
                    <span className="text-gray-300">{log.message}</span>
                    {log.row_number && <span className="text-gray-600 ml-2">row:{log.row_number}</span>}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Refresh logs button */}
            <div className="p-3 border-t border-gray-100">
              <button onClick={() => openJob(selectedJob)}
                className="btn-ghost text-sm w-full">↻ Refresh Logs</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

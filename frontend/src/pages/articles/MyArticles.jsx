import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  PlusIcon, PencilIcon, TrashIcon, EyeIcon, ArrowUpTrayIcon,
  ClockIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import articleService from '../../services/articleService';
import { timeAgo, STATUS_COLORS, STATUS_LABELS } from '../../utils/helpers';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const STATUS_FILTERS = [
  { value: '', label: 'All Articles' },
  { value: 'draft', label: 'Drafts' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

export default function MyArticles() {
  useNavigate();
  useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12, search, status: statusFilter };
      const data = await articleService.getMyArticles(params);
      setArticles(Array.isArray(data.data?.data) ? data.data.data : (data.data?.data?.articles || []));
      setPagination(data.data?.pagination || {});
    } catch {
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await articleService.deleteArticle(deleteTarget.id);
      toast.success('Article deleted');
      fetchArticles();
    } catch {
      toast.error('Failed to delete article');
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      setActionLoading(true);
      await articleService.submitForReview(submitTarget.id);
      toast.success('Submitted for review!');
      fetchArticles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setActionLoading(false);
      setSubmitTarget(null);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">My Articles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your knowledge base contributions
          </p>
        </div>
        <Link to="/articles/new" className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <PlusIcon className="w-4 h-4" />
          New Article
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your articles..."
              className="input pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input sm:w-48"
          >
            {STATUS_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Status tab pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${statusFilter === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          title="No articles found"
          description={search || statusFilter ? 'Try adjusting your filters.' : 'Start contributing by writing your first article.'}
          action={!search && !statusFilter ? (
            <Link to="/articles/new" className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Write First Article
            </Link>
          ) : null}
        />
      ) : (
        <>
          <div className="space-y-3">
            {articles.map(article => (
              <div
                key={article.id}
                className="card hover:border-indigo-100 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={STATUS_COLORS[article.status]} size="sm">
                        {STATUS_LABELS[article.status] || article.status}
                      </Badge>
                      {article.is_featured && <Badge variant="warning" size="sm">Featured</Badge>}
                      {article.category_name && (
                        <span className="text-xs text-gray-400">{article.category_name}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      <Link to={`/articles/${article.slug}`}>{article.title}</Link>
                    </h3>
                    {article.summary && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {timeAgo(article.updated_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-3.5 h-3.5" />
                        {article.view_count?.toLocaleString()} views
                      </span>
                      {article.version_number > 1 && (
                        <span>v{article.version_number}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/articles/${article.slug}`}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="View"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Link>
                    {(article.status === 'draft' || article.status === 'rejected') && (
                      <Link
                        to={`/articles/${article.id}/edit`}
                        className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                    )}
                    {article.status === 'draft' && (
                      <button
                        onClick={() => setSubmitTarget(article)}
                        className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Submit for Review"
                      >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                      </button>
                    )}
                    {['draft', 'rejected', 'archived'].includes(article.status) && (
                      <button
                        onClick={() => setDeleteTarget(article)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Article"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={Boolean(submitTarget)}
        title="Submit for Review"
        message={`Submit "${submitTarget?.title}" for review? Reviewers will be notified.`}
        confirmLabel="Submit"
        loading={actionLoading}
        onConfirm={handleSubmitForReview}
        onCancel={() => setSubmitTarget(null)}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getArticles } from '../../services/articleService';
import { getCategories } from '../../services/categoryService';
import { getTags } from '../../services/tagService';
import { useAuth } from '../../context/AuthContext';
import { STATUS_COLORS, STATUS_LABELS, stripHtml, truncate } from '../../utils/helpers';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';

export default function ArticleList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthor } = useAuth();
  const [articles, setArticles]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters]     = useState({
    category_id: '', tag_id: '', sort: params.get('sort') || 'latest', page: 1
  });

  useEffect(() => {
    Promise.all([getCategories(), getTags()]).then(([c, t]) => {
      setCategories(c.data?.data?.categories || []);
      setTags(t.data?.data?.tags || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getArticles(filters);
        setArticles(Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.articles || []));
        setPagination(res.data?.pagination || {});
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [filters]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination.total} articles available</p>
        </div>
        {isAuthor() && (
          <button onClick={() => navigate('/articles/new')} className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Article
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.category_id} onChange={e => setFilter('category_id', e.target.value)}
          className="input w-auto text-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.tag_id} onChange={e => setFilter('tag_id', e.target.value)}
          className="input w-auto text-sm">
          <option value="">All Tags</option>
          {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)}
          className="input w-auto text-sm">
          <option value="latest">Latest</option>
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="az">A-Z</option>
        </select>
        {(filters.category_id || filters.tag_id) && (
          <button onClick={() => setFilters({ category_id:'', tag_id:'', sort:'latest', page:1 })}
            className="btn-ghost text-sm text-red-500">Clear filters</button>
        )}
      </div>

      {/* Articles grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : articles.length === 0 ? (
        <EmptyState icon="📭" title="No articles found" description="Try adjusting your filters or search for something else." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {articles.map(a => (
            <div key={a.id} onClick={() => navigate(`/articles/${a.id}`)}
              className="card p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{ backgroundColor: (a.category_color || '#6366f1') + '20', color: a.category_color || '#6366f1' }}>
                  {a.category_name}
                </span>
                <Badge className={STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug">{a.title}</h3>
              <p className="text-sm text-gray-500 flex-1 line-clamp-2 mb-3">
                {a.summary ? truncate(a.summary, 100) : truncate(stripHtml(a.content), 100)}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {(a.tags || []).slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
                <span>{a.author_name}</span>
                <div className="flex items-center gap-3">
                  <span>👁 {a.view_count}</span>
                  {a.avg_rating > 0 && <span>⭐ {parseFloat(a.avg_rating).toFixed(1)}</span>}
                  <span>{a.read_time_minutes}m read</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={filters.page} totalPages={pagination.totalPages}
        onPageChange={p => setFilters(f => ({...f, page: p}))} />
    </div>
  );
}

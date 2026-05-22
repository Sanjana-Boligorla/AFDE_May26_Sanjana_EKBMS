import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon, XMarkIcon,
  EyeIcon, ClockIcon, FunnelIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import searchService from '../../services/searchService';
import categoryService from '../../services/categoryService';
import { timeAgo, STATUS_COLORS, STATUS_LABELS } from '../../utils/helpers';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';

function highlightText(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5">{part}</mark>
      : part
  );
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'views', label: 'Most Viewed' },
  { value: 'rating', label: 'Highest Rated' },
];

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category_id: searchParams.get('category') || '',
    sort: 'relevance',
  });

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoryService.getCategories();
      const flat = [];
      const flatten = (cats, depth = 0) => {
        cats.forEach(c => {
          flat.push({ ...c, depth });
          if (c.children?.length) flatten(c.children, depth + 1);
        });
      };
      flatten(data.data?.data?.categories || []);
      setCategories(flat);
    } catch {}
  }, []);

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setPagination({});
      return;
    }
    try {
      setLoading(true);
      const data = await searchService.search({
        q: query,
        page,
        limit: 10,
        ...filters,
      });
      setResults(data.data?.results || []);
      setPagination(data.pagination || {});
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, page, filters]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { performSearch(); }, [performSearch]);
  useEffect(() => { setPage(1); }, [query, filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setQuery(inputValue.trim());
    setSearchParams({ q: inputValue.trim() });
    setShowSuggestions(false);
  };

  const handleSuggestionFetch = async (val) => {
    if (val.length < 2) { setSuggestions([]); return; }
    try {
      const data = await searchService.getSuggestions(val);
      setSuggestions(data.data?.suggestions || []);
    } catch {}
  };

  const handleInputChange = (val) => {
    setInputValue(val);
    handleSuggestionFetch(val);
    setShowSuggestions(true);
  };

  const selectSuggestion = (s) => {
    setInputValue(s);
    setQuery(s);
    setSearchParams({ q: s });
    setShowSuggestions(false);
  };

  const clearFilter = (key) => {
    setFilters(p => ({ ...p, [key]: '' }));
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && k !== 'sort').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search header */}
      <div>
        <h1 className="page-title">Search Knowledge Base</h1>
        <p className="text-sm text-gray-500 mt-1">Find articles, guides, and documentation</p>
      </div>

      {/* Search form */}
      <div className="card">
        <form onSubmit={handleSearch} className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                onFocus={() => inputValue.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Search articles by title, content, or keyword..."
                className="input pl-10 text-base"
                autoComplete="off"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(''); setQuery(''); setSearchParams({}); setSuggestions([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                    >
                      <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="btn-primary px-6">Search</button>
          </div>
        </form>

        {/* Filter & Sort row */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${showFilters || activeFilterCount > 0
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center ml-1">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Sort:</span>
            <select
              value={filters.sort}
              onChange={e => setFilters(p => ({ ...p, sort: e.target.value }))}
              className="input py-1.5 text-sm w-auto"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Category</label>
                <select
                  value={filters.category_id}
                  onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {'  '.repeat(cat.depth)}{cat.depth > 0 ? '↳ ' : ''}{cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.category_id && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                {categories.find(c => String(c.id) === String(filters.category_id))?.name || 'Category'}
                <button onClick={() => clearFilter('category_id')}>
                  <XMarkIcon className="w-3 h-3 ml-0.5" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {!query ? (
        <div className="text-center py-16 text-gray-400">
          <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Start searching</p>
          <p className="text-sm mt-1">Enter keywords to find articles in the knowledge base</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : results.length === 0 ? (
        <EmptyState
          title={`No results for "${query}"`}
          description="Try different keywords, check your spelling, or broaden your search."
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {pagination.total?.toLocaleString()} result{pagination.total !== 1 ? 's' : ''} for{' '}
              <span className="font-medium text-gray-800">"{query}"</span>
            </p>
          </div>

          <div className="space-y-3">
            {results.map(article => (
              <div key={article.id} className="card hover:border-indigo-100 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Badge variant={STATUS_COLORS[article.status] || 'default'} size="sm">
                        {STATUS_LABELS[article.status] || article.status}
                      </Badge>
                      {article.category_name && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {article.category_name}
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/articles/${article.slug}`}
                      className="font-semibold text-gray-900 hover:text-indigo-700 transition-colors text-lg leading-tight"
                    >
                      {highlightText(article.title, query)}
                    </Link>
                    {article.summary && (
                      <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">
                        {highlightText(article.summary, query)}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      <span>
                        {article.author_first_name} {article.author_last_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {timeAgo(article.published_at || article.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-3 h-3" />
                        {article.view_count?.toLocaleString()}
                      </span>
                      {article.avg_rating > 0 && (
                        <span className="flex items-center gap-1">
                          <StarSolidIcon className="w-3 h-3 text-amber-400" />
                          {Number(article.avg_rating).toFixed(1)}
                        </span>
                      )}
                      {article.read_time_minutes && (
                        <span>{article.read_time_minutes} min read</span>
                      )}
                    </div>
                    {/* Tags */}
                    {article.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {article.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
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
    </div>
  );
}

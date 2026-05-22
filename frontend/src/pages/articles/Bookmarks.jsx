import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { BookmarkSlashIcon, EyeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import bookmarkService from '../../services/bookmarkService';
import { formatDate, STATUS_COLORS, STATUS_LABELS } from '../../utils/helpers';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await bookmarkService.getBookmarks({ page, limit: 12 });
      setBookmarks(data.data?.data?.bookmarks || []);
      setPagination({});
    } catch {
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const handleRemove = async (bookmarkId) => {
    try {
      await bookmarkService.removeBookmarkById(bookmarkId);
      toast.success('Bookmark removed');
      fetchBookmarks();
    } catch {
      toast.error('Failed to remove bookmark');
    }
  };

  const filtered = bookmarks.filter(b =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Bookmarks</h1>
        <p className="text-sm text-gray-500 mt-1">Articles you've saved for later</p>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
            className="input pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matching bookmarks' : 'No bookmarks yet'}
          description={search ? 'Try a different search term.' : 'Browse articles and bookmark them to read later.'}
          action={!search && (
            <Link to="/articles" className="btn-primary">Browse Articles</Link>
          )}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(bookmark => (
              <div key={bookmark.id} className="card hover:border-indigo-100 transition-colors group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant={STATUS_COLORS[bookmark.status] || 'default'} size="sm">
                        {STATUS_LABELS[bookmark.status] || bookmark.status}
                      </Badge>
                      {bookmark.category_name && (
                        <span className="text-xs text-gray-400">{bookmark.category_name}</span>
                      )}
                    </div>
                    <Link
                      to={`/articles/${bookmark.slug}`}
                      className="font-semibold text-gray-900 hover:text-indigo-700 transition-colors line-clamp-2"
                    >
                      {bookmark.title}
                    </Link>
                  </div>
                  <button
                    onClick={() => handleRemove(bookmark.id, bookmark.title)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    title="Remove bookmark"
                  >
                    <BookmarkSlashIcon className="w-4 h-4" />
                  </button>
                </div>

                {bookmark.summary && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{bookmark.summary}</p>
                )}

                {bookmark.note && (
                  <div className="px-3 py-2 bg-amber-50 rounded-lg mb-3">
                    <p className="text-xs text-amber-700 italic">"{bookmark.note}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                  <span>
                    By {bookmark.author_first_name} {bookmark.author_last_name}
                  </span>
                  <div className="flex items-center gap-3">
                    {bookmark.avg_rating > 0 && (
                      <span className="flex items-center gap-1">
                        <StarSolidIcon className="w-3 h-3 text-amber-400" />
                        {Number(bookmark.avg_rating).toFixed(1)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <EyeIcon className="w-3 h-3" />
                      {bookmark.view_count?.toLocaleString()}
                    </span>
                    <span>Saved {formatDate(bookmark.created_at)}</span>
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

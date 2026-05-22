import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { BellIcon, CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getNotifications, markRead, markAllRead } from '../../services/notificationService';
import { timeAgo } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';

const NOTIF_ICONS = {
  article_approved:   { icon: '✅', color: 'bg-green-50 text-green-600' },
  article_rejected:   { icon: '❌', color: 'bg-red-50 text-red-600' },
  revision_requested: { icon: '🔁', color: 'bg-amber-50 text-amber-600' },
  article_submitted:  { icon: '📬', color: 'bg-blue-50 text-blue-600' },
  comment_added:      { icon: '💬', color: 'bg-purple-50 text-purple-600' },
  article_published:  { icon: '🚀', color: 'bg-indigo-50 text-indigo-600' },
};

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'article_approved', label: 'Approvals' },
  { value: 'comment_added', label: 'Comments' },
  { value: 'article_submitted', label: 'Submissions' },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const res = await getNotifications({ page: pageNum, limit: 20 });
      const data = res.data?.data;
      const items = data?.notifications || [];
      setNotifications(prev => append ? [...prev, ...items] : items);
      setUnreadCount(data?.unread_count || 0);
      setHasMore(items.length === 20);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(1); }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchNotifications(next, true);
  };

  const handleClick = (n) => {
    if (!n.is_read) handleMarkRead(n.id);
    if (n.link_url) navigate(n.link_url);
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter) return n.type === filter;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BellIcon className="w-6 h-6" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Stay up to date with your articles and activity</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <CheckCircleIcon className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${filter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No notifications"
          description={filter ? 'No notifications match this filter.' : "You're all caught up!"}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const meta = NOTIF_ICONS[n.type] || { icon: '🔔', color: 'bg-gray-50 text-gray-600' };
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`card flex items-start gap-4 cursor-pointer hover:border-indigo-200 transition-all
                  ${!n.is_read ? 'border-indigo-100 bg-indigo-50/30' : ''}`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${meta.color}`}>
                  {meta.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                  {n.link_url && (
                    <p className="text-xs text-indigo-500 mt-1">Click to view →</p>
                  )}
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}

          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                className="btn-ghost text-sm text-indigo-600"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

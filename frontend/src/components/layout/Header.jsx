import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markAllRead } from '../../services/notificationService';
import { timeAgo } from '../../utils/helpers';

export default function Header({ onMenuClick }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [query, setQuery]             = useState('');
  const [notifications, setNotifs]    = useState([]);
  const [unread, setUnread]           = useState(0);
  const [showNotifs, setShowNotifs]   = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getNotifications({ limit: 20 });
        // res = { success, data: { notifications, unread_count } }
        setNotifs(res.data?.data?.notifications || []);
        setUnread(res.data?.data?.unread_count || 0);
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setUnread(0);
      setNotifs(n => n.map(x => ({ ...x, is_read: true })));
    } catch {}
  };

  const NOTIF_ICONS = {
    article_approved:    '✅',
    article_rejected:    '❌',
    revision_requested:  '🔁',
    article_submitted:   '📬',
    comment_added:       '💬',
    article_published:   '🚀',
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 lg:px-6 sticky top-0 z-10">
      {/* Mobile menu */}
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unread > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <span className="text-sm font-semibold text-gray-900">Notifications</span>
                {unread > 0 && (
                  <button onClick={handleMarkAll} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No notifications yet</p>
                ) : notifications.slice(0, 8).map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer
                      ${!n.is_read ? 'bg-primary-50/40' : ''}`}
                  >
                    <div className="flex gap-3">
                      <span className="text-lg mt-0.5 flex-shrink-0">{NOTIF_ICONS[n.type] || '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-tight">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-primary-600 rounded-full mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold hover:bg-primary-700 transition-colors"
          title="Your profile"
        >
          {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : 'U'}
        </button>
      </div>
    </header>
  );
}

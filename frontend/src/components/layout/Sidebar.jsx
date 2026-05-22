import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NavItem = ({ to, icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`
    }
  >
    <span className="text-base leading-none">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

const SectionLabel = ({ label }) => (
  <p className="px-3 pt-5 pb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-widest">
    {label}
  </p>
);

export default function Sidebar({ open, onClose }) {
  const { user, logoutUser, isAdmin, isReviewer, isAuthor } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-screen w-64 bg-slate-900 flex flex-col z-30
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
            KB
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">EKBMS</p>
            <p className="text-slate-500 text-xs">Knowledge Base</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">

          {/* Main */}
          <NavItem to="/dashboard"     icon="📊" label="Dashboard" end />
          <NavItem to="/articles"      icon="📄" label="All Articles" />
          <NavItem to="/search"        icon="🔍" label="Search" />
          <NavItem to="/notifications" icon="🔔" label="Notifications" />
          <NavItem to="/bookmarks"     icon="🔖" label="My Bookmarks" />

          {/* Content (authors+) */}
          {isAuthor() && (
            <>
              <SectionLabel label="Content" />
              <NavItem to="/my-articles"  icon="✏️" label="My Articles" />
              <NavItem to="/articles/new" icon="➕" label="New Article" />
            </>
          )}

          {/* Review (reviewer+) */}
          {isReviewer() && (
            <>
              <SectionLabel label="Review" />
              <NavItem to="/approval-queue" icon="✅" label="Approval Queue" />
            </>
          )}

          {/* Analytics (admin + reviewer) */}
          {(isAdmin() || isReviewer()) && (
            <>
              <SectionLabel label="Analytics" />
              <NavItem to="/analytics"        icon="📈" label="Analytics Dashboard" />
              {isAdmin() && (
                <NavItem to="/etl-jobs"       icon="⚙️" label="ETL Job Manager" />
              )}
            </>
          )}

          {/* Admin only */}
          {isAdmin() && (
            <>
              <SectionLabel label="Admin" />
              <NavItem to="/admin/categories" icon="🗂️" label="Categories" />
              <NavItem to="/admin/tags"       icon="🏷️" label="Tags" />
              <NavItem to="/admin/users"      icon="👥" label="Users" />
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-800 p-3 space-y-1">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-slate-400 capitalize">{user?.role_name}</p>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-red-400 text-sm transition-colors"
          >
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
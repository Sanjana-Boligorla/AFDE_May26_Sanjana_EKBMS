import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Spinner from './components/common/Spinner';

// Auth pages
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Main pages
import Dashboard      from './pages/dashboard/Dashboard';
import ArticleList    from './pages/articles/ArticleList';
import ArticleDetail  from './pages/articles/ArticleDetail';
import ArticleForm    from './pages/articles/ArticleForm';
import MyArticles     from './pages/articles/MyArticles';
import SearchResults  from './pages/search/SearchResults';
import Bookmarks      from './pages/articles/Bookmarks';

// Admin / reviewer pages
import ApprovalQueue      from './pages/admin/ApprovalQueue';
import CategoryManagement from './pages/admin/CategoryManagement';
import UserManagement     from './pages/admin/UserManagement';
import TagManagement      from './pages/admin/TagManagement';
import NotificationsPage  from './pages/notifications/NotificationsPage';
import NotFound           from './pages/NotFound';
import Profile            from './pages/auth/Profile';

// Route guards
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const RoleRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role_name)) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public routes */}
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected routes inside Layout */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="dashboard"         element={<Dashboard />} />
        <Route path="articles"          element={<ArticleList />} />
        <Route path="articles/new"      element={<ArticleForm />} />
        
        <Route path="articles/:id/edit"   element={<ArticleForm />} />
        <Route path="articles/:slug"      element={<ArticleDetail />} />
        <Route path="my-articles"       element={<MyArticles />} />
        <Route path="bookmarks"         element={<Bookmarks />} />
        <Route path="search"            element={<SearchResults />} />
        <Route path="profile"           element={<Profile />} />

        {/* Reviewer + Admin */}
        <Route path="approval-queue" element={
          <RoleRoute roles={['admin','reviewer']}>
            <ApprovalQueue />
          </RoleRoute>
        } />

        {/* Admin only */}
        <Route path="admin/categories" element={
          <RoleRoute roles={['admin']}>
            <CategoryManagement />
          </RoleRoute>
        } />
        <Route path="admin/users" element={
          <RoleRoute roles={['admin']}>
            <UserManagement />
          </RoleRoute>
        } />
        <Route path="admin/tags" element={
          <RoleRoute roles={['admin']}>
            <TagManagement />
          </RoleRoute>
        } />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontSize: '14px', maxWidth: '400px' },
            success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

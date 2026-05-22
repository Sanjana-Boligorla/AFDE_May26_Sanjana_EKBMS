import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('ekbms_token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await getMe();
      setUser(res.data.data.user);
    } catch {
      localStorage.removeItem('ekbms_token');
      localStorage.removeItem('ekbms_user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const loginUser = (token, userData) => {
    localStorage.setItem('ekbms_token', token);
    localStorage.setItem('ekbms_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logoutUser = () => {
    localStorage.removeItem('ekbms_token');
    localStorage.removeItem('ekbms_user');
    setUser(null);
  };

  const hasRole = (...roles) => user && roles.includes(user.role_name);
  const isAdmin     = () => hasRole('admin');
  const isReviewer  = () => hasRole('admin', 'reviewer');
  const isAuthor    = () => hasRole('admin', 'author', 'hr', 'support');

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, hasRole, isAdmin, isReviewer, isAuthor }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

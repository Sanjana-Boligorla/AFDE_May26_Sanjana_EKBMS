import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../services/authService';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';

const DEMO_ACCOUNTS = [
  { role: 'Admin',    email: 'admin@ekbms.com' },
  { role: 'Author',   email: 'sarah.c@ekbms.com' },
  { role: 'Reviewer', email: 'emily.r@ekbms.com' },
  { role: 'Employee', email: 'michael.b@ekbms.com' },
];

export default function Login() {
  const { loginUser } = useAuth();
  const navigate      = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.data.token, res.data.data.user);
      toast.success(`Welcome back, ${res.data.data.user.first_name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message
        || err.message
        || 'Login failed. Check that the backend is running.';
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(p => ({ ...p, [field]: '' }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-xl">
            <span className="text-white font-bold text-xl">KB</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in to your EKBMS account</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className={`input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`input ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors mt-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Signing in...</span>
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">Create one</Link>
          </p>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Demo Accounts — click to fill
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(({ role, email }) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ email, password: 'Password@123' })}
                className="text-left px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10 hover:border-white/30"
              >
                <span className="block text-sm font-semibold text-white">{role}</span>
                <span className="block text-xs text-slate-400 truncate">{email}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">Password: <span className="text-slate-300 font-mono">Password@123</span></p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../services/authService';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ first_name:'', last_name:'', email:'', password:'', confirm_password:'', department:'' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const set = (k, v) => { setForm(f => ({...f, [k]: v})); setErrors(e => ({...e, [k]: ''})); };

  const validate = () => {
    const e = {};
    if (!form.first_name) e.first_name = 'First name is required';
    if (!form.last_name)  e.last_name  = 'Last name is required';
    if (!form.email)      e.email      = 'Email is required';
    if (!form.password)   e.password   = 'Password is required';
    if (form.password.length < 8) e.password = 'Min 8 characters';
    if (!/(?=.*[A-Z])(?=.*[0-9])/.test(form.password)) e.password = 'Must include uppercase letter and number';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setLoading(true);
    try {
      const { confirm_password, ...payload } = form;
      await register(payload);
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const Input = ({ id, label, type='text', placeholder }) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type={type} placeholder={placeholder}
        value={form[id]} onChange={e => set(id, e.target.value)}
        className={`input ${errors[id] ? 'border-red-400' : ''}`} />
      {errors[id] && <p className="mt-1 text-xs text-red-500">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-xl">KB</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-slate-400 mt-1 text-sm">Join the EKBMS platform</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input id="first_name" label="First name" placeholder="Jane" />
              <Input id="last_name"  label="Last name"  placeholder="Doe" />
            </div>
            <Input id="email"            label="Email address" type="email"    placeholder="you@company.com" />
            <Input id="department"       label="Department (optional)"          placeholder="e.g. IT, HR" />
            <Input id="password"         label="Password"       type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" />
            <Input id="confirm_password" label="Confirm password" type="password" placeholder="Repeat password" />

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <><Spinner size="sm" /><span>Creating account...</span></> : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

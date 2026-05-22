import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, changePassword } from '../../services/authService';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';
import { ROLE_COLORS } from '../../utils/helpers';
import Badge from '../../components/common/Badge';

export default function Profile() {
  const { user, loginUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '', last_name: user?.last_name || '',
    phone: user?.phone || '', job_title: user?.job_title || '', bio: user?.bio || '',
  });
  const [pwForm, setPwForm] = useState({ current_password:'', new_password:'', confirm:'' });
  const [saving, setSaving] = useState(false);

  const handleProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile(form);
      const token = localStorage.getItem('ekbms_token');
      loginUser(token, res.data.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed!');
      setPwForm({ current_password:'', new_password:'', confirm:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="page-title">My Profile</h1>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={ROLE_COLORS[user?.role_name]}>{user?.role_name}</Badge>
              <span className="text-sm text-gray-500">{user?.department}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Member since {formatDate(user?.created_at)}</p>
          </div>
        </div>

        <form onSubmit={handleProfile} className="grid grid-cols-2 gap-4">
          {[['first_name','First Name'],['last_name','Last Name'],['job_title','Job Title'],['phone','Phone']].map(([k,l]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} className="input" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="label">Bio</label>
            <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
              rows={3} className="input resize-none" placeholder="A short bio..." />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Change Password</h2>
        <form onSubmit={handlePassword} className="space-y-4 max-w-sm">
          {[['current_password','Current Password'],['new_password','New Password'],['confirm','Confirm New Password']].map(([k,l]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input type="password" value={pwForm[k]} onChange={e => setPwForm({...pwForm, [k]: e.target.value})} className="input" />
            </div>
          ))}
          <button type="submit" className="btn-primary">Update Password</button>
        </form>
      </div>
    </div>
  );
}

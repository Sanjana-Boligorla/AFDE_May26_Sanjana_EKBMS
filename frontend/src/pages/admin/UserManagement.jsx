import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon, PencilIcon, CheckCircleIcon, XCircleIcon
} from '@heroicons/react/24/outline';
import userService from '../../services/userService';
import { timeAgo } from '../../utils/helpers';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';

const ROLE_VARIANTS = {
  admin: 'danger',
  reviewer: 'info',
  author: 'success',
  employee: 'default',
  hr: 'warning',
  support: 'warning',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ role_id: '', is_active: true, department: '', job_title: '' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15, search, role: roleFilter, is_active: statusFilter };
      const data = await userService.getUsers(params);
      setUsers(data.data?.users || []);
      setPagination(data.pagination || {});
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await userService.getRoles();
      setRoles(data.data?.roles || []);
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchRoles(); }, [fetchRoles]);
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      role_id: user.role_id?.toString() || '',
      is_active: user.is_active !== false,
      department: user.department || '',
      job_title: user.job_title || '',
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await userService.updateUser(editUser.id, {
        role_id: Number(editForm.role_id),
        is_active: editForm.is_active,
        department: editForm.department,
        job_title: editForm.job_title,
      });
      toast.success('User updated!');
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await userService.updateUser(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage user accounts, roles, and access</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or employee ID..."
              className="input pl-9"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="input sm:w-40"
          >
            <option value="">All Roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input sm:w-36"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : users.length === 0 ? (
          <div className="p-8"><EmptyState title="No users found" description="Try adjusting your filters." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Last Login</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-700">
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {u.first_name} {u.last_name}
                          </p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                          {u.employee_id && <p className="text-xs text-gray-400">{u.employee_id}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                      {u.department || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_VARIANTS[u.role_name] || 'default'} size="sm">
                        {u.role_name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircleIcon className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <XCircleIcon className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">
                      {u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit user"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.is_active
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {u.is_active
                            ? <XCircleIcon className="w-4 h-4" />
                            : <CheckCircleIcon className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          onPageChange={setPage}
        />
      )}

      {/* Edit Modal */}
      <Modal
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        title={editUser ? `Edit User: ${editUser.first_name} ${editUser.last_name}` : ''}
        size="md"
      >
        {editUser && (
          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-700">
                  {editUser.first_name?.[0]}{editUser.last_name?.[0]}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{editUser.first_name} {editUser.last_name}</p>
                <p className="text-sm text-gray-500">{editUser.email}</p>
              </div>
            </div>

            <div>
              <label className="label">Role</label>
              <select
                value={editForm.role_id}
                onChange={e => setEditForm(p => ({ ...p, role_id: e.target.value }))}
                className="input"
                required
              >
                <option value="">Select role...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Department</label>
              <input
                type="text"
                value={editForm.department}
                onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))}
                placeholder="e.g. Engineering, HR..."
                className="input"
              />
            </div>

            <div>
              <label className="label">Job Title</label>
              <input
                type="text"
                value={editForm.job_title}
                onChange={e => setEditForm(p => ({ ...p, job_title: e.target.value }))}
                placeholder="e.g. Software Engineer..."
                className="input"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="text-indigo-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Account Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setEditUser(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Spinner size="sm" /> : null}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

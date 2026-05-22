import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';
import { getTags, createTag, updateTag, deleteTag } from '../../services/tagService';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#64748b',
];

const defaultForm = { name: '', color_code: '#6366f1' };

export default function TagManagement() {
  const [tags, setTags]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm]         = useState(defaultForm);
  const [saving, setSaving]     = useState(false);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTags({ limit: 200 });
      setTags(res.data?.data?.tags || []);
    } catch {
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (tag) => {
    setEditTarget(tag);
    setForm({ name: tag.name, color_code: tag.color_code || '#6366f1' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      setSaving(true);
      if (editTarget) {
        await updateTag(editTarget.id, form);
        toast.success('Tag updated!');
      } else {
        await createTag(form);
        toast.success('Tag created!');
      }
      setModalOpen(false);
      fetchTags();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTag(deleteTarget.id);
      toast.success('Tag deleted');
      fetchTags();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete tag (may be in use)');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = tags.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tag Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tags.length} tag{tags.length !== 1 ? 's' : ''} in the system
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> New Tag
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tags..."
          className="input"
        />
      </div>

      {/* Tags grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matching tags' : 'No tags yet'}
          description={search ? 'Try a different search.' : 'Create tags to label articles.'}
          action={!search && (
            <button onClick={openCreate} className="btn-primary">Create First Tag</button>
          )}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tag</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Slug</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Usage</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(tag => (
                <tr key={tag.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: (tag.color_code || '#6366f1') + '22',
                        color: tag.color_code || '#6366f1',
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color_code || '#6366f1' }}
                      />
                      {tag.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-mono hidden sm:table-cell">
                    {tag.slug}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-gray-700">{tag.usage_count || 0}</span>
                    <span className="text-xs text-gray-400 ml-1">articles</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(tag)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tag)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? `Edit: ${editTarget.name}` : 'Create Tag'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Tag Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Getting Started"
              className="input"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mt-1 items-center">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color_code: color }))}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                    form.color_code === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={form.color_code}
                onChange={e => setForm(p => ({ ...p, color_code: e.target.value }))}
                className="w-7 h-7 rounded-full cursor-pointer border-0"
                title="Custom color"
              />
            </div>

            {/* Preview */}
            {form.name && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1.5">Preview:</p>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: form.color_code + '22',
                    color: form.color_code,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: form.color_code }} />
                  {form.name}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner size="sm" /> : null}
              {editTarget ? 'Save Changes' : 'Create Tag'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Tag"
        message={`Delete "${deleteTarget?.name}"? It will be removed from all articles.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

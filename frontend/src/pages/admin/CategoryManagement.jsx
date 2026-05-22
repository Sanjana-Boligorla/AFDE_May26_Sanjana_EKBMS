import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon, PencilIcon, TrashIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';
import categoryService from '../../services/categoryService';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
];

const CategoryRow = ({ category, depth, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children?.length > 0;

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors group">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-0.5 rounded text-gray-400 hover:text-gray-700"
              >
                <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span
              className="text-lg"
              title={category.icon}
            >
              {category.icon || (hasChildren ? '📁' : '📄')}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{category.name}</span>
                {category.color_code && (
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: category.color_code }}
                  />
                )}
                {!category.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Inactive</span>
                )}
              </div>
              <p className="text-xs text-gray-400">{category.slug}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
          {category.description || <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-sm text-center text-gray-600">
          {category.article_count || 0}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(category)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {hasChildren && expanded && category.children.map(child => (
        <CategoryRow
          key={child.id}
          category={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
};

const defaultForm = {
  name: '', description: '', parent_id: '', icon: '',
  color_code: '#6366f1', sort_order: 0, is_active: true,
};

function flattenCategories(cats, depth = 0, skipId = null) {
  const result = [];
  for (const cat of cats) {
    if (cat.id === skipId) continue;
    result.push({ ...cat, depth });
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1, skipId));
    }
  }
  return result;
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoryService.getCategories({ tree: true });
      setCategories(data.data?.categories || []);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditTarget(cat);
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      parent_id: cat.parent_id?.toString() || '',
      icon: cat.icon || '',
      color_code: cat.color_code || '#6366f1',
      sort_order: cat.sort_order || 0,
      is_active: cat.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      setSaving(true);
      const payload = {
        ...form,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        sort_order: Number(form.sort_order),
      };
      if (editTarget) {
        await categoryService.updateCategory(editTarget.id, payload);
        toast.success('Category updated!');
      } else {
        await categoryService.createCategory(payload);
        toast.success('Category created!');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await categoryService.deleteCategory(deleteTarget.id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete category (may have articles)');
    } finally {
      setDeleteTarget(null);
    }
  };

  const flatCats = flattenCategories(categories, 0, editTarget?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Category Management</h1>
          <p className="text-sm text-gray-500 mt-1">Organize articles with a hierarchical category structure</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : categories.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No categories yet"
              description="Create categories to organize your knowledge base."
              action={<button onClick={openCreate} className="btn-primary">Create First Category</button>}
            />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Articles</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map(cat => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  depth={0}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? `Edit: ${editTarget.name}` : 'Create Category'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Human Resources"
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Parent Category</label>
            <select
              value={form.parent_id}
              onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}
              className="input"
            >
              <option value="">Top-level category</option>
              {flatCats.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {'  '.repeat(cat.depth)}{cat.depth > 0 ? '↳ ' : ''}{cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of this category..."
              rows={2}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Icon (Emoji)</label>
              <input
                type="text"
                value={form.icon}
                onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                placeholder="e.g. 📁"
                className="input"
                maxLength={4}
              />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))}
                className="input"
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
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
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="text-indigo-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner size="sm" /> : null}
              {editTarget ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Any sub-categories will become top-level. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

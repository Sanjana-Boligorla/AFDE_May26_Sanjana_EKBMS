import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../../context/AuthContext';
import articleService from '../../services/articleService';
import categoryService from '../../services/categoryService';
import tagService from '../../services/tagService';
import Spinner from '../../components/common/Spinner';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
};
const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'list', 'bullet', 'indent',
  'blockquote', 'code-block', 'link', 'image',
];

function flattenCategories(cats, depth = 0) {
  const result = [];
  for (const cat of cats) {
    result.push({ ...cat, depth });
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

export default function ArticleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  useAuth();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');

  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    category_id: '',
    visibility: 'internal',
    is_featured: false,
    tags: [],
    change_note: '',
  });
  const [errors, setErrors] = useState({});

  const loadMeta = useCallback(async () => {
    try {
      const [catData, tagData] = await Promise.all([
        categoryService.getCategories(),
        tagService.getTags({ limit: 100 }),
      ]);
      const flatCats = flattenCategories(catData.data?.data?.categories || []);
      setCategories(flatCats);
      setAllTags(tagData.data?.data?.tags || []);
    } catch {
      toast.error('Failed to load form data');
    }
  }, []);

  const loadArticle = useCallback(async () => {
    try {
      const data = await articleService.getArticleById(id);
      const a = data.data?.data?.article;
      setForm({
        title: a.title || '',
        summary: a.summary || '',
        content: a.content || '',
        category_id: a.category_id?.toString() || '',
        visibility: a.visibility || 'internal',
        is_featured: a.is_featured || false,
        tags: a.tags?.map(t => t.id) || [],
        change_note: '',
      });
    } catch {
      toast.error('Article not found');
      navigate('/my-articles');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadMeta();
    if (isEdit) loadArticle();
  }, [loadMeta, loadArticle, isEdit]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.category_id) e.category_id = 'Category is required';
    if (!form.content || form.content === '<p><br></p>') e.content = 'Content is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        tags: form.tags,
      };
      if (isEdit) {
        await articleService.updateArticle(id, payload);
        toast.success('Article updated!');
        navigate(`/articles/${id}/edit`);
      } else {
        const data = await articleService.createArticle(payload);
        toast.success('Article created!');
        navigate(`/articles/${data.data?.data?.article?.slug || ''}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId],
    }));
  };

  const filteredTags = allTags.filter(t =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">{isEdit ? 'Edit Article' : 'Create New Article'}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isEdit ? 'Update your article content and settings.' : 'Share your knowledge with the organization.'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main editor area */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title */}
            <div className="card">
              <label className="label">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Enter a descriptive title..."
                className={`input ${errors.title ? 'border-red-300 focus:ring-red-500' : ''}`}
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
            </div>

            {/* Summary */}
            <div className="card">
              <label className="label">Summary / Excerpt</label>
              <textarea
                value={form.summary}
                onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                placeholder="Brief description shown in article listings..."
                rows={3}
                className="input"
              />
              <p className="mt-1 text-xs text-gray-400">{form.summary.length}/300 characters</p>
            </div>

            {/* Content editor */}
            <div className="card">
              <label className="label">Content <span className="text-red-500">*</span></label>
              <div className={`quill-wrapper rounded-lg overflow-hidden ${errors.content ? 'ring-1 ring-red-300' : 'ring-1 ring-gray-200'}`}>
                <ReactQuill
                  theme="snow"
                  value={form.content}
                  onChange={val => setForm(p => ({ ...p, content: val }))}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                  placeholder="Write your article content here..."
                  style={{ minHeight: '400px' }}
                />
              </div>
              {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}
            </div>

            {/* Change note (edit mode) */}
            {isEdit && (
              <div className="card">
                <label className="label">Change Note</label>
                <input
                  type="text"
                  value={form.change_note}
                  onChange={e => setForm(p => ({ ...p, change_note: e.target.value }))}
                  placeholder="Briefly describe what changed in this version..."
                  className="input"
                />
              </div>
            )}
          </div>

          {/* Sidebar settings */}
          <div className="space-y-5">
            {/* Publish / Save buttons */}
            <div className="card">
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {saving ? <Spinner size="sm" /> : null}
                  {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Save as Draft')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(isEdit ? `/articles/${id}` : '/my-articles')}
                  className="btn-ghost w-full"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Category */}
            <div className="card">
              <label className="label">Category <span className="text-red-500">*</span></label>
              <select
                value={form.category_id}
                onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                className={`input ${errors.category_id ? 'border-red-300 focus:ring-red-500' : ''}`}
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {'  '.repeat(cat.depth)}{cat.depth > 0 ? '↳ ' : ''}{cat.name}
                  </option>
                ))}
              </select>
              {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id}</p>}
            </div>

            {/* Visibility */}
            <div className="card">
              <label className="label">Visibility</label>
              <div className="space-y-2">
                {['public', 'internal', 'private'].map(v => (
                  <label key={v} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="visibility"
                      value={v}
                      checked={form.visibility === v}
                      onChange={() => setForm(p => ({ ...p, visibility: v }))}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 capitalize">{v}</span>
                      <p className="text-xs text-gray-400">
                        {v === 'public' && 'Visible to everyone'}
                        {v === 'internal' && 'Visible to logged-in users'}
                        {v === 'private' && 'Only visible to you and admins'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="card">
              <label className="label">Tags</label>
              <input
                type="text"
                value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
                placeholder="Search tags..."
                className="input mb-3 text-sm"
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredTags.map(tag => (
                  <label key={tag.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-gray-50 rounded px-1">
                    <input
                      type="checkbox"
                      checked={form.tags.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                      className="text-indigo-600 rounded"
                    />
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={tag.color_code
                        ? { backgroundColor: tag.color_code + '22', color: tag.color_code }
                        : { backgroundColor: '#f3f4f6', color: '#374151' }
                      }
                    >
                      {tag.name}
                    </span>
                  </label>
                ))}
              </div>
              {form.tags.length > 0 && (
                <p className="mt-2 text-xs text-indigo-600 font-medium">{form.tags.length} tag{form.tags.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>

            {/* Featured */}
            <div className="card">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))}
                  className="text-indigo-600 rounded w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Feature this article</span>
                  <p className="text-xs text-gray-400">Featured articles are highlighted on the homepage</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

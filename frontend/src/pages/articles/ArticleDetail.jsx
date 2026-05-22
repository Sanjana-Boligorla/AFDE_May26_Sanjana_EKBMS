import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  EyeIcon, StarIcon, BookmarkIcon, ClockIcon, CalendarIcon,
  UserIcon, TagIcon, FolderIcon, ChevronLeftIcon, PencilIcon,
  TrashIcon, PaperClipIcon,
  ChatBubbleLeftIcon, ArrowUpTrayIcon, ClockIcon as HistoryIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import articleService from '../../services/articleService';
import commentService from '../../services/commentService';
import bookmarkService from '../../services/bookmarkService';
import { formatDate, timeAgo, STATUS_COLORS, STATUS_LABELS } from '../../utils/helpers';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const StarRating = ({ value, onChange, readonly = false }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'} focus:outline-none`}
        >
          {(hover || value) >= star ? (
            <StarSolidIcon className="w-5 h-5 text-amber-400" />
          ) : (
            <StarIcon className="w-5 h-5 text-gray-300" />
          )}
        </button>
      ))}
    </div>
  );
};

const CommentItem = ({ comment, currentUser, onReply, onEdit, onDelete }) => {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText('');
    setShowReplyBox(false);
  };

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
        <span className="text-xs font-semibold text-indigo-700">
          {comment.first_name?.[0]}{comment.last_name?.[0]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-gray-900">
              {comment.first_name} {comment.last_name}
            </span>
            <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-2">
          {currentUser && (
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="text-xs text-gray-500 hover:text-indigo-600 font-medium"
            >
              Reply
            </button>
          )}
          {currentUser?.id === comment.user_id && (
            <button onClick={() => onDelete(comment.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">
              Delete
            </button>
          )}
        </div>
        {showReplyBox && (
          <div className="mt-2 flex gap-2">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="input flex-1 text-sm"
            />
            <div className="flex flex-col gap-1">
              <button onClick={handleReply} className="btn-primary text-xs px-3 py-1">Post</button>
              <button onClick={() => setShowReplyBox(false)} className="btn-ghost text-xs px-3 py-1">Cancel</button>
            </div>
          </div>
        )}
        {comment.replies?.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-3">
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUser={currentUser}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function ArticleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true);
      const data = await articleService.getArticle(slug);
      setArticle(data.data?.data?.article);
      setIsBookmarked(data.data?.data?.article?.is_bookmarked || false);
      setUserRating(data.data?.data?.article?.user_rating || 0);
    } catch (err) {
      toast.error('Article not found');
      navigate('/articles');
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  const fetchComments = useCallback(async (articleId) => {
    try {
      const data = await commentService.getComments(articleId);
      setComments(data.data?.data?.comments || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  useEffect(() => {
    if (article?.id) {
      fetchComments(article.id);
    }
  }, [article?.id, fetchComments]);

  const handleBookmark = async () => {
    if (!user) { toast.error('Please log in to bookmark'); return; }
    try {
      if (isBookmarked) {
        await bookmarkService.removeBookmark(article.id);
        setIsBookmarked(false);
        toast.success('Bookmark removed');
      } else {
        await bookmarkService.addBookmark(article.id);
        setIsBookmarked(true);
        toast.success('Article bookmarked!');
      }
    } catch (err) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleRating = async (rating) => {
    if (!user) { toast.error('Please log in to rate'); return; }
    try {
      await articleService.rateArticle(article.id, rating);
      setUserRating(rating);
      toast.success(`Rated ${rating} star${rating > 1 ? 's' : ''}!`);
      fetchArticle();
    } catch (err) {
      toast.error('Failed to submit rating');
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      setSubmittingComment(true);
      await commentService.addComment(article.id, { content: newComment });
      setNewComment('');
      fetchComments(article.id);
      toast.success('Comment posted!');
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = async (parentId, content) => {
    try {
      await commentService.addComment(article.id, { content, parent_id: parentId });
      fetchComments(article.id);
    } catch {
      toast.error('Failed to post reply');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentService.deleteComment(commentId);
      fetchComments(article.id);
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await articleService.deleteArticle(article.id);
      toast.success('Article deleted');
      navigate('/my-articles');
    } catch {
      toast.error('Failed to delete article');
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      setActionLoading(true);
      await articleService.submitForReview(article.id);
      toast.success('Article submitted for review!');
      fetchArticle();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setActionLoading(false);
      setShowSubmitConfirm(false);
    }
  };

  const handleLoadVersions = async () => {
    if (!showVersions) {
      try {
        const data = await articleService.getVersions(article.id);
        setVersions(data.data?.data?.versions || []);
      } catch {}
    }
    setShowVersions(!showVersions);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!article) return null;

  const canEdit = user && (user.id === article.author_id || isAdmin());
  const canDelete = user && (user.id === article.author_id || isAdmin());
  const canSubmit = user && user.id === article.author_id && article.status === 'draft';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/articles" className="hover:text-indigo-600 flex items-center gap-1">
          <ChevronLeftIcon className="w-4 h-4" /> Articles
        </Link>
        {article.category_name && (
          <>
            <span>/</span>
            <span>{article.category_name}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Article header */}
          <div className="card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant={STATUS_COLORS[article.status]} size="sm">
                    {STATUS_LABELS[article.status] || article.status}
                  </Badge>
                  {article.is_featured && (
                    <Badge variant="warning" size="sm">Featured</Badge>
                  )}
                  {article.visibility !== 'public' && (
                    <Badge variant="default" size="sm">{article.visibility}</Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {article.title}
                </h1>
                {article.summary && (
                  <p className="mt-2 text-gray-600 text-base leading-relaxed">
                    {article.summary}
                  </p>
                )}
              </div>
            </div>

            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 border-y border-gray-100 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <UserIcon className="w-4 h-4" />
                {article.author_first_name} {article.author_last_name}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4" />
                {article.published_at ? formatDate(article.published_at) : formatDate(article.created_at)}
              </span>
              {article.read_time_minutes && (
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4" />
                  {article.read_time_minutes} min read
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <EyeIcon className="w-4 h-4" />
                {article.view_count?.toLocaleString()} views
              </span>
              {article.avg_rating > 0 && (
                <span className="flex items-center gap-1.5">
                  <StarSolidIcon className="w-4 h-4 text-amber-400" />
                  {Number(article.avg_rating).toFixed(1)} ({article.rating_count})
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <button
                onClick={handleBookmark}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${isBookmarked
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-indigo-200 hover:text-indigo-600'
                  }`}
              >
                {isBookmarked
                  ? <BookmarkSolidIcon className="w-4 h-4" />
                  : <BookmarkIcon className="w-4 h-4" />
                }
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>

              {canEdit && (
                <Link
                  to={`/articles/${article.id}/edit`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:border-blue-200 hover:text-blue-600 transition-colors"
                >
                  <PencilIcon className="w-4 h-4" /> Edit
                </Link>
              )}
              {canSubmit && (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" /> Submit for Review
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" /> Delete
                </button>
              )}
              <button
                onClick={handleLoadVersions}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 transition-colors ml-auto"
              >
                <HistoryIcon className="w-4 h-4" />
                Version History
              </button>
            </div>
          </div>

          {/* Article content */}
          <div className="card">
            <div
              className="prose prose-indigo max-w-none article-content"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>

          {/* Tags */}
          {article.tags?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TagIcon className="w-4 h-4" /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <Link
                    key={tag.id}
                    to={`/articles?tag=${tag.id}`}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    style={tag.color_code ? { backgroundColor: tag.color_code + '22', color: tag.color_code } : {}}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Version history */}
          {showVersions && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4" /> Version History
              </h3>
              {versions.length === 0 ? (
                <p className="text-sm text-gray-500">No versions found.</p>
              ) : (
                <div className="space-y-2">
                  {versions.map(v => (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="font-medium text-sm text-gray-800">v{v.version_number}</span>
                        {v.change_note && (
                          <span className="ml-2 text-sm text-gray-500">{v.change_note}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {v.changed_by_name} • {timeAgo(v.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="card" id="comments">
            <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <ChatBubbleLeftIcon className="w-5 h-5" />
              Comments ({comments.length})
            </h3>

            {user ? (
              <div className="mb-6 flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-xs font-semibold text-indigo-700">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={3}
                    className="input text-sm"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleCommentSubmit}
                      disabled={submittingComment || !newComment.trim()}
                      className="btn-primary text-sm px-4 py-1.5"
                    >
                      {submittingComment ? <Spinner size="sm" /> : 'Post Comment'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                <Link to="/login" className="text-indigo-600 font-medium">Log in</Link> to leave a comment.
              </p>
            )}

            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No comments yet. Be the first!</p>
            ) : (
              <div className="space-y-4">
                {comments.map(comment => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUser={user}
                    onReply={handleReply}
                    onEdit={() => {}}
                    onDelete={handleDeleteComment}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Rate this article */}
          {user && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Rate this Article</h3>
              <div className="flex items-center gap-3">
                <StarRating value={userRating} onChange={handleRating} />
                {userRating > 0 && (
                  <span className="text-sm text-gray-500">Your rating: {userRating}</span>
                )}
              </div>
              {article.avg_rating > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Average: {Number(article.avg_rating).toFixed(1)} from {article.rating_count} rating{article.rating_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Author info */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Author</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-indigo-700">
                  {article.author_first_name?.[0]}{article.author_last_name?.[0]}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {article.author_first_name} {article.author_last_name}
                </p>
                {article.author_department && (
                  <p className="text-xs text-gray-500">{article.author_department}</p>
                )}
              </div>
            </div>
          </div>

          {/* Category */}
          {article.category_name && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Category</h3>
              <Link
                to={`/articles?category=${article.category_id}`}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
              >
                <FolderIcon className="w-4 h-4" />
                {article.category_name}
              </Link>
            </div>
          )}

          {/* Attachments */}
          {article.attachments?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <PaperClipIcon className="w-4 h-4" />
                Attachments ({article.attachments.length})
              </h3>
              <div className="space-y-2">
                {article.attachments.map(att => (
                  <a
                    key={att.id}
                    href={`/api/attachments/${att.id}/download`}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 transition-colors group"
                  >
                    <PaperClipIcon className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{att.original_name}</p>
                      <p className="text-xs text-gray-400">{(att.file_size_bytes / 1024).toFixed(1)} KB</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Article stats */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Article Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge variant={STATUS_COLORS[article.status]} size="sm">{STATUS_LABELS[article.status]}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span className="font-medium text-gray-800">v{article.version_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Views</span>
                <span className="font-medium text-gray-800">{article.view_count?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium text-gray-800">{formatDate(article.created_at)}</span>
              </div>
              {article.updated_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Updated</span>
                  <span className="font-medium text-gray-800">{timeAgo(article.updated_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <ConfirmDialog
        open={showSubmitConfirm}
        title="Submit for Review"
        message="Submit this article for review? Reviewers will be notified."
        confirmLabel="Submit"
        loading={actionLoading}
        onConfirm={handleSubmitForReview}
        onCancel={() => setShowSubmitConfirm(false)}
      />
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  CheckCircleIcon, XCircleIcon, ArrowPathIcon, EyeIcon,
  UserIcon, ClockIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import approvalService from '../../services/approvalService';
import { timeAgo } from '../../utils/helpers';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

const STATUS_VARIANTS = {
  pending: 'warning',
  under_review: 'info',
  approved: 'success',
  rejected: 'danger',
  revision_requested: 'default',
};

export default function ApprovalQueue() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // Review modal
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAction, setReviewAction] = useState('');

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await approvalService.getApprovals({ status: statusFilter, page, limit: 10 });
      setApprovals(data.data?.approvals || []);
      setPagination(data.pagination || {});
    } catch {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const openReviewModal = (approval, action) => {
    setReviewModal(approval);
    setReviewAction(action);
    setReviewComment('');
  };

  const handleReviewAction = async () => {
    if (reviewAction === 'reject' && !reviewComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      setActionLoading(true);
      if (reviewAction === 'approve') {
        await approvalService.approveArticle(reviewModal.id, { reviewer_comment: reviewComment });
        toast.success('Article approved!');
      } else if (reviewAction === 'reject') {
        await approvalService.rejectArticle(reviewModal.id, { reviewer_comment: reviewComment });
        toast.success('Article rejected');
      } else if (reviewAction === 'revision') {
        await approvalService.requestRevision(reviewModal.id, { reviewer_comment: reviewComment });
        toast.success('Revision requested');
      }
      setReviewModal(null);
      fetchApprovals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async (approvalId) => {
    try {
      await approvalService.assignReviewer(approvalId, { reviewer_id: user.id });
      toast.success('Assigned to you!');
      fetchApprovals();
    } catch {
      toast.error('Failed to assign');
    }
  };

  const STATUS_TABS = [
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'revision_requested', label: 'Revision' },
    { value: '', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Approval Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Review and approve submitted articles</p>
      </div>

      {/* Status tabs */}
      <div className="card p-0 overflow-hidden">
        <div className="flex overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors
                ${statusFilter === tab.value
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                  : 'border-transparent text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : approvals.length === 0 ? (
        <EmptyState
          title="No approvals found"
          description={statusFilter ? `No articles with status "${statusFilter}".` : 'All caught up!'}
        />
      ) : (
        <>
          <div className="space-y-4">
            {approvals.map(approval => (
              <div key={approval.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={STATUS_VARIANTS[approval.status]} size="sm">
                        {approval.status.replace('_', ' ')}
                      </Badge>
                      {approval.category_name && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {approval.category_name}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      <Link to={`/articles/${approval.slug}`} className="hover:text-indigo-700 transition-colors">
                        {approval.article_title}
                      </Link>
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" />
                        Author: {approval.author_first_name} {approval.author_last_name}
                        {approval.author_department && ` (${approval.author_department})`}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        Submitted {timeAgo(approval.submitted_at)}
                      </span>
                      {approval.reviewer_first_name && (
                        <span className="flex items-center gap-1">
                          Reviewer: {approval.reviewer_first_name} {approval.reviewer_last_name}
                        </span>
                      )}
                    </div>

                    {approval.author_note && (
                      <div className="mt-2 px-3 py-2 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700">
                          <span className="font-medium">Author note:</span> {approval.author_note}
                        </p>
                      </div>
                    )}
                    {approval.reviewer_comment && (
                      <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Reviewer:</span> {approval.reviewer_comment}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <Link
                      to={`/articles/${approval.slug}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:border-blue-200 hover:text-blue-600 transition-colors"
                    >
                      <EyeIcon className="w-3.5 h-3.5" /> View
                    </Link>

                    {['pending', 'under_review'].includes(approval.status) && (
                      <>
                        {!approval.reviewer_id && (
                          <button
                            onClick={() => handleAssign(approval.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            Assign to Me
                          </button>
                        )}
                        <button
                          onClick={() => openReviewModal(approval, 'approve')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                        >
                          <CheckCircleIcon className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => openReviewModal(approval, 'revision')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          <ArrowPathIcon className="w-3.5 h-3.5" /> Request Revision
                        </button>
                        <button
                          onClick={() => openReviewModal(approval, 'reject')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                          <XCircleIcon className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Review Modal */}
      <Modal
        open={Boolean(reviewModal)}
        onClose={() => setReviewModal(null)}
        title={
          reviewAction === 'approve' ? 'Approve Article' :
          reviewAction === 'reject' ? 'Reject Article' :
          'Request Revision'
        }
        size="md"
      >
        {reviewModal && (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-800">{reviewModal.article_title}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                by {reviewModal.author_first_name} {reviewModal.author_last_name}
              </p>
            </div>

            <div>
              <label className="label">
                {reviewAction === 'approve' ? 'Comment (optional)' : 'Reason / Feedback'}
                {reviewAction === 'reject' && <span className="text-red-500 ml-1">*</span>}
              </label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder={
                  reviewAction === 'approve'
                    ? 'Leave feedback for the author (optional)...'
                    : 'Explain what needs to be changed or why this is rejected...'
                }
                rows={4}
                className="input"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setReviewModal(null)} className="btn-ghost">Cancel</button>
              <button
                onClick={handleReviewAction}
                disabled={actionLoading}
                className={`flex items-center gap-2 ${
                  reviewAction === 'approve' ? 'btn-primary' :
                  reviewAction === 'reject' ? 'btn-danger' :
                  'bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-lg transition-colors'
                }`}
              >
                {actionLoading ? <Spinner size="sm" /> : null}
                {reviewAction === 'approve' ? 'Approve' :
                 reviewAction === 'reject' ? 'Reject' : 'Request Revision'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

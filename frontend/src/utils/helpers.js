import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return 'N/A';
  return format(new Date(date), 'MMM d, yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return format(new Date(date), 'MMM d, yyyy h:mm a');
};

export const timeAgo = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const STATUS_COLORS = {
  draft:          'bg-gray-100 text-gray-600',
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved:       'bg-blue-100 text-blue-700',
  rejected:       'bg-red-100 text-red-700',
  published:      'bg-green-100 text-green-700',
  archived:       'bg-orange-100 text-orange-700',
};

export const STATUS_LABELS = {
  draft:          'Draft',
  pending_review: 'Pending Review',
  approved:       'Approved',
  rejected:       'Rejected',
  published:      'Published',
  archived:       'Archived',
};

export const ROLE_COLORS = {
  admin:    'bg-purple-100 text-purple-700',
  author:   'bg-blue-100 text-blue-700',
  reviewer: 'bg-indigo-100 text-indigo-700',
  employee: 'bg-gray-100 text-gray-600',
  hr:       'bg-pink-100 text-pink-700',
  support:  'bg-teal-100 text-teal-700',
};

export const truncate = (str, len = 120) =>
  str && str.length > len ? str.slice(0, len) + '...' : str;

export const stripHtml = (html) =>
  html ? html.replace(/<[^>]+>/g, '') : '';

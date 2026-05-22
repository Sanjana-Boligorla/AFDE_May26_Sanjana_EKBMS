import React from 'react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button disabled={page === 1} onClick={() => onPageChange(page - 1)}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        Previous
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onPageChange(p)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${p === page ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          {p}
        </button>
      ))}
      <button disabled={page === totalPages} onClick={() => onPageChange(page + 1)}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        Next
      </button>
    </div>
  );
}

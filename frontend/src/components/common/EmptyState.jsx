import React from 'react';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-4">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto">{description}</p>}
      {action}
    </div>
  );
}

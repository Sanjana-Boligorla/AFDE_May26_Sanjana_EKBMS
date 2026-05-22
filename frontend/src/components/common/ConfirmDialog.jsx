import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

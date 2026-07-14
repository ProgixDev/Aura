'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { useUI } from '@/lib/store';

/**
 * Confirm / action modal. Props (via openModal('confirm', props)):
 *  title, message, confirmLabel, cancelLabel, danger, icon,
 *  withReason (shows a textarea), reasonLabel, successToast, onConfirm(reason)
 *
 * onConfirm may be async and is awaited — see FormModal's onSubmit doc for
 * why (closes + success-toasts only after it resolves; shows an error toast
 * and stays open if it throws).
 */
export function ConfirmModal({ id, title = 'Confirmer', message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false, withReason = false, reasonLabel = 'Motif', successToast, onConfirm }) {
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm?.(reason);
      close(id);
      if (successToast) toast(successToast, danger ? 'danger' : 'success');
    } catch (err) {
      toast(err?.message || 'Une erreur est survenue', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal id={id} title={title} size="modal-sm"
      footer={<>
        <button className="btn btn-soft" onClick={() => close(id)} disabled={submitting}>{cancelLabel}</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={submitting}>{submitting ? 'Veuillez patienter…' : confirmLabel}</button>
      </>}>
      {message && <p className="body">{message}</p>}
      {withReason && (
        <div className="field" style={{ marginTop: 14 }}>
          <label>{reasonLabel}</label>
          <textarea className="input" placeholder="Précisez…" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

export default ConfirmModal;

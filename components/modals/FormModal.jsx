'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { useUI } from '@/lib/store';

/**
 * Generic form modal. Drives ~all data-entry modals (contact, report, review,
 * add note, invite, promo, send notification, edit field, payout…).
 * Props: title, subtitle, fields, submitLabel, successToast, intro, size, onSubmit(values)
 * field = { name, label, type: text|textarea|select|email|number|rating|checkbox, options?, placeholder?, required?, value? }
 */
export function FormModal({ id, title = 'Formulaire', subtitle, intro, fields = [], submitLabel = 'Envoyer', successToast = 'Enregistré', size = '', onSubmit }) {
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.value ?? (f.type === 'checkbox' ? false : f.type === 'rating' ? 5 : '')])));
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit?.(values);
    close(id);
    if (successToast) toast(successToast, 'success');
  };

  return (
    <Modal id={id} title={title} subtitle={subtitle} size={size}>
      {intro && <p className="body" style={{ marginBottom: 16 }}>{intro}</p>}
      <form onSubmit={submit}>
        {fields.map((f) => (
          <div className="field" key={f.name}>
            {f.type !== 'checkbox' && <label>{f.label}{f.required && ' *'}</label>}
            {f.type === 'textarea' ? (
              <textarea className="input" placeholder={f.placeholder} required={f.required} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            ) : f.type === 'select' ? (
              <select className="input" required={f.required} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">{f.placeholder || 'Choisir…'}</option>
                {f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
              </select>
            ) : f.type === 'rating' ? (
              <div className="row gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => set(f.name, n)} style={{ fontSize: 26, lineHeight: 1, color: n <= values[f.name] ? 'var(--violet-2)' : 'var(--line-2)' }}>❀</button>
                ))}
              </div>
            ) : f.type === 'checkbox' ? (
              <label className="row gap-3" style={{ cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
                <span className={`checkbox ${values[f.name] ? 'checked' : ''}`} onClick={() => set(f.name, !values[f.name])}>{values[f.name] && '✓'}</span>
                {f.label}
              </label>
            ) : (
              <input className="input" type={f.type || 'text'} placeholder={f.placeholder} required={f.required} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            )}
          </div>
        ))}
        <div className="modal-foot" style={{ padding: '8px 0 0' }}>
          <button type="button" className="btn btn-soft" onClick={() => close(id)}>Annuler</button>
          <button type="submit" className="btn btn-primary">{submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

export default FormModal;

'use client';
import { useEffect } from 'react';
import { useUI } from '@/lib/store';
import { Icon } from '@/components/ui/Icon';

/** Base modal shell — overlay, escape-to-close, header with close button. */
export function Modal({ id, title, subtitle, size = '', children, footer, onClose }) {
  const close = useUI((s) => s.closeModal);
  const dismiss = () => { onClose?.(); close(id); };

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="small" style={{ marginTop: 4 }}>{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={dismiss} aria-label="Fermer"><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;

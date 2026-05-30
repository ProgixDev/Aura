'use client';
import { useUI } from '@/lib/store';
import { Icon } from './Icon';

export default function ToastRoot() {
  const toasts = useUI((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          {t.tone === 'success' && <Icon name="check" size={16} />}
          {t.tone === 'danger' && <Icon name="x" size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

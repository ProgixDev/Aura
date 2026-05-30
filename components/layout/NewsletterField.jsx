'use client';
import { useUI } from '@/lib/store';

export function NewsletterField() {
  const open = useUI((s) => s.openModal);
  return (
    <button className="btn btn-soft btn-sm" onClick={() => open('newsletter')} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
      ✦ Recevoir la lettre
    </button>
  );
}

export default NewsletterField;

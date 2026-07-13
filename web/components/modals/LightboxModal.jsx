'use client';
import { useState } from 'react';
import { useUI } from '@/lib/store';
import { Icon } from '@/components/ui/Icon';

export function LightboxModal({ id, images = [], start = 0 }) {
  const close = useUI((s) => s.closeModal);
  const [i, setI] = useState(start);
  const prev = () => setI((v) => (v - 1 + images.length) % images.length);
  const next = () => setI((v) => (v + 1) % images.length);
  return (
    <div className="modal-overlay" style={{ background: 'rgba(15,8,30,0.85)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) close(id); }}>
      <button className="modal-close" style={{ position: 'absolute', top: 22, right: 22, background: 'rgba(255,255,255,0.15)', color: '#fff' }} onClick={() => close(id)}><Icon name="x" size={20} /></button>
      <button className="btn btn-icon" style={{ position: 'absolute', left: 22, background: 'rgba(255,255,255,0.15)', color: '#fff' }} onClick={prev}><Icon name="chevronLeft" /></button>
      <img src={images[i]} alt="" style={{ maxWidth: '86vw', maxHeight: '86vh', borderRadius: 16, objectFit: 'contain' }} />
      <button className="btn btn-icon" style={{ position: 'absolute', right: 22, background: 'rgba(255,255,255,0.15)', color: '#fff' }} onClick={next}><Icon name="chevronRight" /></button>
    </div>
  );
}

export default LightboxModal;

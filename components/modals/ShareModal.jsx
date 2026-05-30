'use client';
import { Modal } from './Modal';
import { useUI } from '@/lib/store';
import { Icon } from '@/components/ui/Icon';

export function ShareModal({ id, title = 'Partager', label = 'ce profil', url = 'https://aura.fr' }) {
  const toast = useUI((s) => s.toast);
  const copy = () => { toast('Lien copié', 'success'); };
  const channels = [
    { k: 'mail', name: 'Email' }, { k: 'message', name: 'Messages' },
    { k: 'share', name: 'WhatsApp' }, { k: 'card', name: 'Copier le lien' },
  ];
  return (
    <Modal id={id} title={title} subtitle={`Partagez ${label} autour de vous`} size="modal-sm">
      <div className="grid grid-2 gap-3">
        {channels.map((c) => (
          <button key={c.k} className="card-line card-pad row gap-3" style={{ padding: 16 }} onClick={copy}>
            <span className="tile-icon tint-violet"><Icon name={c.k} size={18} color="var(--violet-2)" /></span>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</span>
          </button>
        ))}
      </div>
      <div className="panel row between gap-3" style={{ marginTop: 16 }}>
        <span className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
        <button className="btn btn-primary btn-sm" onClick={copy}>Copier</button>
      </div>
    </Modal>
  );
}

export default ShareModal;

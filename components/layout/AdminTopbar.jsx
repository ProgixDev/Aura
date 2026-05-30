'use client';
import { usePathname } from 'next/navigation';
import { useUI } from '@/lib/store';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { ADMIN_NAV } from './AdminSidebar';

function titleFor(pathname) {
  for (const g of ADMIN_NAV) for (const it of g.items) {
    if (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + '/')) return it.label;
  }
  return 'Administration';
}

export default function AdminTopbar() {
  const pathname = usePathname();
  const open = useUI((s) => s.openModal);
  return (
    <div className="admin-topbar">
      <span className="page-title">{titleFor(pathname)}</span>
      <div className="spacer" />
      <div className="input-search hide-mobile" style={{ width: 260, position: 'relative' }}>
        <span className="ic"><Icon name="search" size={16} /></span>
        <input className="input" style={{ height: 42 }} placeholder="Rechercher…" />
      </div>
      <button className="btn btn-icon btn-ghost" onClick={() => open('sendNotification')} title="Envoyer une notification"><Icon name="bell" size={18} /></button>
      <Avatar name="Admin Aura" size={36} tone="violet" />
    </div>
  );
}

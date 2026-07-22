'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useUI } from '@/lib/store';
import { useAdminAuth } from '@/lib/admin-auth-store';
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
  const router = useRouter();
  const open = useUI((s) => s.openModal);
  const admin = useAdminAuth((s) => s.admin);
  const signOut = useAdminAuth((s) => s.signOut);

  const handleSignOut = () => {
    signOut();
    router.replace('/admin/connexion');
  };

  return (
    <div className="admin-topbar">
      <span className="page-title">{titleFor(pathname)}</span>
      <div className="spacer" />
      <div className="input-search hide-mobile" style={{ width: 260, position: 'relative' }}>
        <span className="ic"><Icon name="search" size={16} /></span>
        <input className="input" style={{ height: 42 }} placeholder="Rechercher…" />
      </div>
      <button className="btn btn-icon btn-ghost" onClick={() => open('sendNotification')} title="Envoyer une notification"><Icon name="bell" size={18} /></button>
      <button className="btn btn-icon btn-ghost" onClick={handleSignOut} title="Se déconnecter"><Icon name="logout" size={18} /></button>
      <Avatar name={admin?.name || 'Admin GuériEnergies'} size={36} tone="violet" />
    </div>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lotus } from '@/components/ui/Lotus';
import { Icon } from '@/components/ui/Icon';

export const ADMIN_NAV = [
  { group: "Vue d'ensemble", items: [
    { href: '/admin', label: 'Tableau de bord', icon: 'home', exact: true },
    { href: '/admin/analytique', label: 'Analytique', icon: 'chart' },
  ]},
  { group: 'Communauté', items: [
    { href: '/admin/praticiens', label: 'Praticiens', icon: 'sparkle' },
    { href: '/admin/praticiens/verification', label: 'Vérifications', icon: 'shield', badge: 4 },
    { href: '/admin/clients', label: 'Clients', icon: 'users' },
    { href: '/admin/cercles', label: 'Cercles', icon: 'layers' },
  ]},
  { group: 'Activité', items: [
    { href: '/admin/reservations', label: 'Réservations', icon: 'calendar' },
    { href: '/admin/evenements', label: 'Événements', icon: 'ticket' },
    { href: '/admin/echanges', label: 'Échanges', icon: 'share' },
  ]},
  { group: 'Finances', items: [
    { href: '/admin/paiements', label: 'Paiements', icon: 'card' },
    { href: '/admin/remboursements', label: 'Remboursements', icon: 'euro' },
    { href: '/admin/litiges', label: 'Litiges', icon: 'flag', badge: 2 },
    { href: '/admin/abonnements', label: 'Abonnements', icon: 'star' },
    { href: '/admin/promotions', label: 'Promotions', icon: 'tag' },
  ]},
  { group: 'Modération', items: [
    { href: '/admin/avis', label: 'Avis', icon: 'message', badge: 1 },
    { href: '/admin/signalements', label: 'Signalements', icon: 'shield', badge: 3 },
    { href: '/admin/messages', label: 'Messages', icon: 'mail' },
  ]},
  { group: 'Contenu', items: [
    { href: '/admin/contenu', label: 'Journal', icon: 'book' },
    { href: '/admin/disciplines', label: 'Disciplines', icon: 'grid' },
    { href: '/admin/notifications', label: 'Notifications', icon: 'bell' },
    { href: '/admin/emails', label: 'Emails', icon: 'mail' },
  ]},
  { group: 'Système', items: [
    { href: '/admin/support', label: 'Support', icon: 'ticket' },
    { href: '/admin/equipe', label: 'Équipe', icon: 'users' },
    { href: '/admin/roles', label: 'Rôles & accès', icon: 'shield' },
    { href: '/admin/audit', label: "Journal d'audit", icon: 'clock' },
    { href: '/admin/parametres', label: 'Paramètres', icon: 'settings' },
  ]},
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const isActive = (it) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + '/'));
  return (
    <aside className="admin-sidebar">
      <Link href="/admin" className="brand"><Lotus size={22} color="#fff" /> GuériEnergies <span className="tiny" style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>admin</span></Link>
      {ADMIN_NAV.map((g) => (
        <div className="nav-group" key={g.group}>
          <div className="gl">{g.group}</div>
          {g.items.map((it) => (
            <Link key={it.href} href={it.href} className={isActive(it) ? 'active' : ''}>
              <Icon name={it.icon} size={17} />
              <span>{it.label}</span>
              {it.badge && <span className="badge-count">{it.badge}</span>}
            </Link>
          ))}
        </div>
      ))}
      <div className="foot">
        <Link href="/"><Icon name="logout" size={17} /><span>Retour au site</span></Link>
      </div>
    </aside>
  );
}

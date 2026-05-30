'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

const ITEMS = [
  { href: '/compte', label: 'Aperçu', icon: 'home', exact: true },
  { href: '/compte/reservations', label: 'Réservations', icon: 'calendar' },
  { href: '/compte/messages', label: 'Messages', icon: 'message' },
  { href: '/compte/favoris', label: 'Favoris', icon: 'heart' },
  { href: '/compte/avis', label: 'Mes avis', icon: 'star' },
  { href: '/compte/echanges', label: 'Échanges', icon: 'share' },
  { href: '/compte/paiements', label: 'Paiements', icon: 'card' },
  { href: '/compte/parametres', label: 'Paramètres', icon: 'settings' },
];

export default function AccountNav() {
  const pathname = usePathname();
  const active = (it) => (it.exact ? pathname === it.href : pathname.startsWith(it.href));
  return (
    <nav className="card card-pad" style={{ position: 'sticky', top: 92 }}>
      <div className="stack gap-1">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} className="row gap-3" style={{ padding: '10px 12px', borderRadius: 11, fontSize: 14, fontWeight: 500, background: active(it) ? 'var(--mist)' : 'transparent', color: active(it) ? 'var(--ink)' : 'var(--ink-soft)' }}>
            <Icon name={it.icon} size={17} color={active(it) ? 'var(--violet-2)' : 'var(--muted)'} />{it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

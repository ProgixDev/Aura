'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUI } from '@/lib/store';
import { Lotus } from '@/components/ui/Lotus';
import { Icon } from '@/components/ui/Icon';

const LINKS = [
  { href: '/praticiens', label: 'Praticiens' },
  { href: '/disciplines', label: 'Disciplines' },
  { href: '/evenements', label: 'Événements' },
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/devenir-praticien', label: 'Devenir praticien' },
];

export default function SiteNav() {
  const pathname = usePathname();
  const open = useUI((s) => s.openModal);
  const [menu, setMenu] = useState(false);
  const active = (h) => pathname === h || (h !== '/' && pathname.startsWith(h));

  return (
    <header className="site-nav">
      <div className="container inner">
        <Link href="/" className="brand"><Lotus size={26} color="var(--violet-2)" /> Aura</Link>
        <nav className="links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={active(l.href) ? 'active' : ''}>{l.label}</Link>
          ))}
        </nav>
        <div className="spacer" />
        <div className="actions">
          <button className="btn btn-ghost btn-sm hide-mobile" onClick={() => open('login')}>Connexion</button>
          <button className="btn btn-primary btn-sm" onClick={() => open('signup')}>Commencer</button>
          <button className="btn btn-icon btn-ghost" style={{ display: 'none' }} onClick={() => setMenu((m) => !m)} aria-label="Menu"><Icon name="grid" size={18} /></button>
        </div>
      </div>
      {menu && (
        <div className="container" style={{ paddingBottom: 16 }}>
          <div className="stack gap-1">
            {LINKS.map((l) => <Link key={l.href} href={l.href} onClick={() => setMenu(false)} style={{ padding: '10px 0' }}>{l.label}</Link>)}
          </div>
        </div>
      )}
    </header>
  );
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
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
  const [menu, setMenu] = useState(false);
  const active = (h) => pathname === h || (h !== '/' && pathname.startsWith(h));

  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);
  // SiteNav mounts on every (site) page, not just /compte — compte/layout.jsx's own
  // rehydrate() call only fires once that layout mounts, so a public page loaded
  // directly (e.g. a fresh tab landing on "/") would never rehydrate otherwise.
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return (
    <header className="site-nav">
      <div className="container inner">
        <Link href="/" className="brand"><Lotus size={26} color="var(--violet-2)" /> GuériEnergies</Link>
        <nav className="links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={active(l.href) ? 'active' : ''}>{l.label}</Link>
          ))}
        </nav>
        <div className="spacer" />
        <div className="actions">
          {hasHydrated && (
            token ? (
              <Link href="/compte" className="btn btn-primary btn-sm">Mon compte</Link>
            ) : (
              <>
                <Link href="/connexion" className="btn btn-ghost btn-sm hide-mobile">Connexion</Link>
                <Link href="/inscription" className="btn btn-primary btn-sm">Commencer</Link>
              </>
            )
          )}
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

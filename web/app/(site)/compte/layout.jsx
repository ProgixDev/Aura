'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AccountNav from '@/components/layout/AccountNav';
import { useAuthStore } from '@/lib/auth-store';

export default function CompteLayout({ children }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (hasHydrated && !token) router.replace('/connexion');
  }, [hasHydrated, token, router]);

  if (!hasHydrated || !token) {
    return (
      <div className="container section-sm">
        <p className="small muted center">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="container section-sm">
      <div className="grid" style={{ gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'start' }}>
        <AccountNav />
        <div>{children}</div>
      </div>
    </div>
  );
}

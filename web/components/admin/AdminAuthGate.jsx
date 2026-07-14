'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-store';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminTopbar from '@/components/layout/AdminTopbar';

const LOGIN_PATH = '/admin/connexion';

/**
 * Owns admin route protection AND the admin shell (sidebar/topbar) — see the
 * design note in Task 14 of the admin-wiring plan for why the shell lives
 * here instead of directly in `app/admin/layout.jsx`: the login page is
 * necessarily nested under that layout and must render bare.
 */
export default function AdminAuthGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const token = useAdminAuth((s) => s.token);

  useEffect(() => {
    useAdminAuth.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token && pathname !== LOGIN_PATH) router.replace(LOGIN_PATH);
    if (token && pathname === LOGIN_PATH) router.replace('/admin');
  }, [hydrated, token, pathname, router]);

  if (pathname === LOGIN_PATH) return children;

  // Either still reading localStorage, or redirecting to /admin/connexion —
  // render nothing rather than a flash of the shell (or of empty content).
  if (!hydrated || !token) return null;

  return (
    <div className="admin">
      <AdminSidebar />
      <div className="admin-main">
        <AdminTopbar />
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

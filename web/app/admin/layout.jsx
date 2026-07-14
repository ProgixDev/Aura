import AdminAuthGate from '@/components/admin/AdminAuthGate';

export const metadata = { title: 'Aura — Administration' };

export default function AdminLayout({ children }) {
  return <AdminAuthGate>{children}</AdminAuthGate>;
}

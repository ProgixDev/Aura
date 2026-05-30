import AccountNav from '@/components/layout/AccountNav';

export default function CompteLayout({ children }) {
  return (
    <div className="container section-sm">
      <div className="grid" style={{ gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'start' }}>
        <AccountNav />
        <div>{children}</div>
      </div>
    </div>
  );
}

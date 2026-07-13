import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { disputes } from '@/lib/data/admin';
import { euro, dateFr, tone } from '@/lib/format';

export default function AdminLitigesPage() {
  const open = disputes.filter((d) => d.status === 'open').length;
  const highPriority = disputes.filter((d) => d.status === 'open' && d.priority === 'haute').length;
  const amount = disputes.filter((d) => d.status === 'open').reduce((s, d) => s + d.amount, 0);

  return (
    <>
      <PageHead
        title="Litiges"
        subtitle="Médiation entre clients et praticiens."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Litiges' }]}
        actions={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Litiges ouverts" value={String(open)} icon="shield" />
        <StatCard label="Priorité haute" value={String(highPriority)} icon="flag" />
        <StatCard label="Montant en jeu" value={euro(amount)} icon="euro" />
      </div>

      <div className="stack gap-4">
        {disputes.map((d) => {
          const urgent = d.status === 'open' && d.priority === 'haute';
          return (
            <div key={d.id} className={`card card-pad${urgent ? ' tint-violet' : ''}`} style={urgent ? { borderColor: 'var(--danger)' } : undefined}>
              <div className="between wrap gap-3" style={{ alignItems: 'flex-start' }}>
                <div className="flex-1">
                  <div className="row gap-2 wrap" style={{ marginBottom: 8 }}>
                    <strong>{d.ref}</strong>
                    <Badge variant={d.priority === 'haute' ? 'danger' : d.priority === 'normale' ? 'warning' : 'neutral'}>Priorité {d.priority}</Badge>
                    <Badge variant={tone(d.status)}>{d.status}</Badge>
                    <span className="tiny muted">{dateFr(d.date)}</span>
                  </div>
                  <div className="h-4 serif" style={{ marginBottom: 10 }}>{d.reason}</div>
                  <div className="row gap-5 wrap small">
                    <div className="row gap-2"><Avatar name={d.clientName} size={28} tone="sky" /><span>{d.clientName} <span className="muted">· client</span></span></div>
                    <div className="row gap-2"><Avatar name={d.practitionerName} size={28} tone="violet" /><span>{d.practitionerName} <span className="muted">· praticien</span></span></div>
                    <div className="row gap-2"><Icon name="euro" size={15} color="var(--muted)" /><span>{euro(d.amount)}</span></div>
                  </div>
                </div>
                <div className="row gap-2">
                  {d.status === 'open'
                    ? <ModalButton modal="resolveDispute" payload={{ ref: d.ref, client: d.clientName, practitioner: d.practitionerName, amount: euro(d.amount) }} className="btn btn-primary btn-sm">Résoudre</ModalButton>
                    : <Badge variant="success" dot>Résolu</Badge>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

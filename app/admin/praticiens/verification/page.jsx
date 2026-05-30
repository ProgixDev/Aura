import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { practitioners } from '@/lib/data/practitioners';
import { dateFr } from '@/lib/format';

const DOCS = [
  { label: "Pièce d'identité", ok: true },
  { label: 'Certification / diplôme', ok: true },
  { label: 'Attestation d\'assurance', ok: true },
  { label: 'Justificatif de domicile', ok: false },
  { label: 'Charte éthique signée', ok: true },
];

export default function VerificationQueuePage() {
  const queue = practitioners.slice(0, 4).map((p, i) => ({
    ...p,
    docs: DOCS.map((d, j) => ({ ...d, ok: (i + j) % 5 !== 3 })),
  }));

  return (
    <>
      <PageHead
        title="File de vérification"
        subtitle={`${queue.length} praticiens en attente de validation manuelle.`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens', href: '/admin/praticiens' }, { label: 'Vérification' }]}
        actions={<Badge variant="warning" dot>{queue.length} en attente</Badge>}
      />

      <div className="note tint-gold" style={{ marginBottom: 22 }}>
        <Icon name="shield" size={16} color="var(--gold-2)" />
        <span className="small">Vérifiez chaque document avant d'approuver. Une fois validé, le praticien obtient le badge <strong>vérifié</strong> et apparaît dans les résultats de recherche.</span>
      </div>

      <div className="grid grid-2">
        {queue.map((p) => {
          const missing = p.docs.filter((d) => !d.ok).length;
          return (
            <div key={p.id} className="card card-pad">
              <div className="row gap-3" style={{ marginBottom: 16 }}>
                <Avatar src={p.photo} name={p.name} tone={p.tone} size={52} />
                <div className="flex-1">
                  <div className="row gap-2"><strong>{p.name}</strong><Badge variant="warning">En attente</Badge></div>
                  <div className="small">{p.specialties.join(' · ')}</div>
                  <div className="tiny">{p.city} · inscrit le {dateFr(p.joined)}</div>
                </div>
              </div>

              <div className="divider" />

              <div className="eyebrow" style={{ marginTop: 4, marginBottom: 10 }}>Documents soumis</div>
              <div className="stack gap-2" style={{ marginBottom: 16 }}>
                {p.docs.map((d) => (
                  <div key={d.label} className="row gap-2 between">
                    <span className="row gap-2 small">
                      <Icon name={d.ok ? 'checkCircle' : 'clock'} size={15} color={d.ok ? 'var(--sage-2)' : 'var(--gold-2)'} />
                      {d.label}
                    </span>
                    <Badge variant={d.ok ? 'success' : 'warning'}>{d.ok ? 'Reçu' : 'Manquant'}</Badge>
                  </div>
                ))}
              </div>

              {missing > 0 && (
                <div className="note tint-violet" style={{ marginBottom: 14 }}>
                  <span className="tiny">{missing} document{missing > 1 ? 's' : ''} en attente — relancez le praticien si besoin.</span>
                </div>
              )}

              <div className="row gap-2 wrap">
                <ModalButton modal="verifyPractitioner" payload={{ name: p.name }} successToast="Praticien vérifié" className="btn btn-primary btn-sm flex-1">
                  <Icon name="check" size={15} /> Vérifier
                </ModalButton>
                <ModalButton modal="rejectPractitioner" payload={{ name: p.name }} className="btn btn-danger-soft btn-sm flex-1">
                  <Icon name="x" size={15} /> Rejeter
                </ModalButton>
                <ModalButton modal="contact" payload={{ name: p.name }} className="btn btn-soft btn-sm btn-icon" as="button" title="Contacter">
                  <Icon name="mail" size={15} />
                </ModalButton>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

'use client';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { Tabs } from '@/components/ui/Tabs';
import { ModalButton } from '@/components/ui/ModalButton';
import { euro, dateFr, tone } from '@/lib/format';

const DOCS = [
  { label: "Pièce d'identité", note: 'Vérifiée le 12 mars' },
  { label: 'Certification praticien', note: 'Conforme' },
  { label: "Attestation d'assurance", note: 'Valide jusqu\'en 2027' },
  { label: 'Charte éthique Aura', note: 'Signée' },
];

export default function PractitionerTabs({ p, myBookings, myReviews }) {
  return (
    <Tabs tabs={[
      { key: 'infos', label: 'Informations' },
      { key: 'documents', label: 'Documents' },
      { key: 'bookings', label: `Réservations (${myBookings.length})` },
      { key: 'reviews', label: `Avis (${myReviews.length})` },
    ]}>
      {(active) => {
        if (active === 'infos') {
          return (
            <div className="grid grid-2">
              <div className="card card-pad">
                <h3 className="h-4" style={{ marginBottom: 14 }}>Coordonnées</h3>
                <dl className="dl">
                  <dt>Email</dt><dd>{p.email}</dd>
                  <dt>Téléphone</dt><dd>{p.phone}</dd>
                  <dt>Ville</dt><dd>{p.city} · {p.region}</dd>
                  <dt>Inscrit le</dt><dd>{dateFr(p.joined)}</dd>
                  <dt>Temps de réponse</dt><dd>{p.responseTime}</dd>
                </dl>
              </div>
              <div className="card card-pad">
                <h3 className="h-4" style={{ marginBottom: 14 }}>Pratique</h3>
                <dl className="dl">
                  <dt>Niveau</dt><dd>{p.level}</dd>
                  <dt>Mode</dt><dd>{p.mode}</dd>
                  <dt>Tarif</dt><dd>{euro(p.price)} / {p.duration} min</dd>
                  <dt>Expérience</dt><dd>{p.experience.years} ans · {p.experience.sessions} séances</dd>
                  <dt>Spécialités</dt><dd>{p.specialties.join(', ')}{p.extraSpecialty ? `, ${p.extraSpecialty}` : ''}</dd>
                </dl>
                <div className="divider" />
                <div className="eyebrow" style={{ marginBottom: 8 }}>Approche</div>
                <p className="small italic">{p.approach}</p>
              </div>
            </div>
          );
        }
        if (active === 'documents') {
          return (
            <div className="card card-pad">
              <h3 className="h-4" style={{ marginBottom: 16 }}>Pièces justificatives</h3>
              <div className="stack gap-3">
                {DOCS.map((d) => (
                  <div key={d.label} className="row gap-3 between">
                    <span className="row gap-3">
                      <span className="tile-icon glyph-sage"><Icon name="checkCircle" size={16} color="var(--sage-2)" /></span>
                      <span><div style={{ fontWeight: 500 }}>{d.label}</div><div className="tiny">{d.note}</div></span>
                    </span>
                    <Badge variant="success" dot>Validé</Badge>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="row gap-2 wrap">
                <ModalButton modal="verifyPractitioner" payload={{ name: p.name }} successToast="Vérification confirmée" className="btn btn-soft btn-sm"><Icon name="check" size={15} /> Re-valider</ModalButton>
                <ModalButton modal="addNote" payload={{ name: p.name }} successToast="Note enregistrée" className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Ajouter une note</ModalButton>
              </div>
            </div>
          );
        }
        if (active === 'bookings') {
          return (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="table">
                <thead><tr><th>Réf.</th><th>Client</th><th>Date</th><th>Mode</th><th>Montant</th><th>Statut</th></tr></thead>
                <tbody>
                  {myBookings.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty"><div className="glyph">❍</div>Aucune réservation</div></td></tr>
                  ) : myBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="table-cell-main">{b.ref}</td>
                      <td>{b.clientName}</td>
                      <td className="small">{dateFr(b.date)} · {b.slot}</td>
                      <td className="small">{b.mode}</td>
                      <td>{euro(b.price)}</td>
                      <td><Badge variant={tone(b.status)}>{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <div className="stack gap-4">
            {myReviews.length === 0 ? (
              <div className="empty"><div className="glyph">❍</div>Aucun avis pour le moment</div>
            ) : myReviews.map((r) => (
              <div key={r.id} className="card card-pad">
                <div className="between" style={{ marginBottom: 8 }}>
                  <div className="row gap-2"><strong>{r.author}</strong><Badge variant={tone(r.status)}>{r.status}</Badge></div>
                  <Rating value={r.rating} size={13} />
                </div>
                <p className="small">{r.text}</p>
                <div className="row gap-2 between" style={{ marginTop: 10 }}>
                  <span className="tiny">{r.mode} · {r.when}</span>
                  <ModalButton modal="moderateReview" payload={{ name: p.name }} className="btn btn-link btn-sm"><Icon name="flag" size={13} /> Modérer</ModalButton>
                </div>
              </div>
            ))}
          </div>
        );
      }}
    </Tabs>
  );
}
